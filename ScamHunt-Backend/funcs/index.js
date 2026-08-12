import * as functions from 'firebase-functions'
import admin from 'firebase-admin'
import * as adminAuth from 'firebase-admin/auth'
import axios from 'axios'
import Stripe from 'stripe'
import dotenv from 'dotenv'
import fs from 'fs'
import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';
import { onCallGenkit } from 'firebase-functions/v2/https';
import {
  getFunctions,
  httpsCallable,
} from 'firebase/functions';
import {initializeApp} from 'firebase/app'

dotenv.config()
admin.initializeApp()

const stripe = new Stripe(process.env["STRIPE"])

const models = genkit({
    plugins: [googleAI({apiKey: process.env["GEMINI"]})], 
    model: googleAI.model("gemini-3.6-flash")
})

export const addUser = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {
    const {email, password} = req.query
    try{
        const addEmailAuth = (await admin.auth().createUser({email: email, password: password}))

        return res.status(200).send({"uid": addEmailAuth.uid, "summary": "add the UID to your checkout function"})
    } catch(err) {
        return res.status(200).send(err)
    }
})

export const addCheckout = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {
    const {user} = req.query

    const session = await stripe.checkout.sessions.create({
        metadata: {user: user},
        line_items: [
            {
                price: "price_1U04YEIjUuQYDWzWlRJ7asdq",
            }
        ],
        mode: "subscription",
        automatic_tax: {enabled: true}, 
        tax_id_collection: {enabled: true}, 
        success_url: "https://addcustomers-z2v6b6ghoq-uc.a.run.app/?sessionId={CHECKOUT_SESSION_ID}", 
        cancel_url: "https://addcustomer-7gne7wtmba-uc.a.run.app?sessionId={CHECKOUT_SESSION_ID}", 
        currency: "usd"
    })

    return res.redirect(301, session.url)
})

export const addCustomers = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {
    const {sessionId} = req.query

    const getCheckoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    const userId = getCheckoutSession.metadata.user 

    const checkUser = new Promise(async (resolve) => {
        try{
            const checkFirebaseUser = await admin.auth().getUser(userId)
            resolve(checkFirebaseUser.uid)
        } catch (err) {
            resolve(err)
        }
    })

    const user = await checkUser

    if(userId != user){
        res.status(200).send(user)
        return res.end()
    }

    const obj = {
        user: getCheckoutSession.metadata.user, 
        active: true, 
        description: "Subscribed To ScamHunt Pay As You Go",
        customer: getCheckoutSession.customer
    }

    const updateCustomer = await stripe.customers.update(getCheckoutSession.customer, {metadata: obj})
    
    return res.status(200).send({"user": "Your UID Is ", "customer": updateCustomer})
})

export const getUsage = functions.https.onRequest({cors: true}, async (req, res) => {
    const {user} = req.query

    const checkUser = () => new Promise(async (resolve) => {
        try{
            const {uid} = await admin.auth().getUser(user)
            return resolve(uid)
        } catch (err) {
            return resolve(err)
        }
    })

    const userId = await checkUser()

    if(user != userId){
        return res.status(200).send(userId)
    }

    const get_customers = (await stripe.customers.list()).data

    const obj = []
    for(let i = 0; i != get_customers.length; i++){
        const getUID = get_customers[i].metadata.user
        if(getUID == user){
            obj.push(get_customers[i])
            break
        }
    }

    const subscription = (await stripe.subscriptions.list({
        customer: obj[0].id, 
        status: "active", 
    }))

    const subscriptionId = subscription.data[0].id

    const customer = obj[0].id

    const getBilling = await stripe.invoices.createPreview({
        customer: customer, 
        subscription: subscriptionId
    })

    res.status(200).send((Number.parseFloat(getBilling.amount_due / 100)).toString())
    return res.end()
})

export const removeUser = functions.https.onRequest({cors: true}, async (req, res) => {
    const {user} = req.query

    const checkUser = () => new Promise(async (resolve) => {
        try{
            const {uid} = await admin.auth().getUser(user)
            return resolve(uid)
        } catch (err) {
            return resolve(err)
        }
    })

    const userId = await checkUser()

    if(user != userId){
        return res.status(200).send(userId)
    }

    const deletion = await admin.auth().deleteUser(user)

    return res.status(200).send(deletion)
})

export const cancelSubscription = functions.https.onRequest({cors: true}, async (req, res) => {
    const {user} = req.query

    const checkUser = () => new Promise(async (resolve) => {
        try{
            const {uid} = await admin.auth().getUser(user)
            return resolve(uid)
        } catch (err) {
            return resolve(err)
        }
    })

    const userId = await checkUser()

    if(user != userId){
        return res.status(200).send(userId)
    }

    try{
        const customers = await (await stripe.customers.list()).data

        let obj = []
        for(let i = 0; i != customers.length; i++){
            if(customers[i].metadata.user == user){
                obj.push(customers[i])
                break
            }
        }


        const subscription = await stripe.subscriptions.list({
            customer: obj[0].id, 
            status: "active"
        })

        const deleteSub = await stripe.subscriptions.cancel(subscription.data[0].id)

        return res.status(200).send({summary: "your subscription is now canceled", config: deleteSub})   
    } catch (err) {
        return res.status(200).send(err)
    }
})

const scamFlow = models.defineFlow({
    name: "scamFlow", 
    inputSchema: z.object({
        title: z.string().describe("The Title Of The Video"),
        source: z.string().describe("The Video Search Sources"),  
        videoCreator: z.string().describe("Who Made The Video"),
        comments: z.array(z.string().describe("The Comment")).describe("The List Of Comments")
    }), 
    outputSchema: z.object({
        comments: z.array(
            z.object({
                name: z.string().describe("Who Wrote The Comment"), 
                comment: z.string().describe("The Comment"), 
                factual: z.boolean().describe("Is This True Or False Or Null For Neutral"),
                summary: z.string().describe("A 10 word summary of the comment of the comments factuality and truthfulness based on the google searches"), 
                stance: z.enum(["left", "right", "center", "neutral"]).describe("Are They Left, Right, Center Or Neutral")
            })
        ).describe("List Of Every Comments")
    })
}, async (input) => {
    const prompt = "List Every One Of These Comments And Tell Me If They True Or False: " + input.comments.map((e) => {return e}).join(", ") + ", The Video: " + input.title + " Made By " + input.videoCreato + " And Use This Search Source Data From The Web: " + input.source

    const response = await models.generate({
        prompt: prompt,
        model: googleAI.model("gemini-3.6-flash"),
        output: {
            schema: z.object({
                comments: z.array(
                    z.object({
                        name: z.string().describe("Who Wrote The Comment"), 
                        comment: z.string().describe("The Comment"), 
                        factual: z.boolean().describe("Is This True Or False Or Null For Neutral"),
                        summary: z.string().describe("A 25 word summary of the comment of the comments factuality and truthfulness based on the google searches"), 
                        stance: z.enum(["left", "right", "center", "neutral"]).describe("Are They Left, Right, Center Or Neutral")
                    })
                ).describe("List Of Every Comments")
            })
        }
    })
    return response.output
})

export const generateCheck = onCallGenkit(
    scamFlow
)

export const factCheck = functions.https.onRequest({cors: true, timeoutSeconds: 3600, memory: "1GiB"}, async (req, res) => {
    const {user, videoId, comments} = req.query

    const checkingUser = new Promise(async (resolve) => {
        try {
            const checkFirebaseUser = await admin.auth().getUser(user)
            resolve(checkFirebaseUser.uid)
        } catch (err) {
            resolve(err)
        }
    })

    const userId = await checkingUser

    if(userId != user){
        res.status(200).send(userId)
        return res.end()
    }

    const customerList = (await stripe.customers.list()).data

    let obj = {}
    for(let i = 0; i != customerList.length; i++){
        if(customerList[i] == undefined){
            obj = "user, not found"
            continue
        }

        if(customerList[i].metadata.user != userId){
            obj = userId + " is not the right user"
            continue
        }

        if(customerList[i].metadata.user == userId){
            obj = customerList[i]
            break
        }
    }

    if(obj == userId + " is not the right user" || obj == "user, not found"){
        return res.status(200).send(obj)
    }
    
    const usageEventPlus = await stripe.billing.meterEvents.create({
        event_name: "scamhunt_usage", 
        payload: {
            value: "1",
            stripe_customer_id: obj.id
        }
    })

    const videoLink = "https://www.googleapis.com/youtube/v3/videos"

    const videoWebby = (await axios.get(videoLink, {params: {"key": process.env["GOOGLE"], "part": "snippet", "id": videoId}}))["data"]["items"][0]["snippet"]

    const url = "https://api.search.brave.com/res/v1/web/search?q=" + videoWebby["title"]

    const headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": process.env["BRAVE"]
    }

    const search_webby = (await axios.get(url, {headers: headers, params: {"q": videoWebby["title"]}}))["data"]["web"]["results"]
    const search_data = (search_webby.slice(0, 12).map((e) => {return e["title"] + " - " + e["url"] + " - " + e["description"]})).join("\n")

    const title = videoWebby["title"] + " About " + videoWebby["description"] + " Made By " + videoWebby["channelTitle"]

    if(Number.isInteger(Number.parseInt(comments)) === false){
        return res.status(200).send("Comment Number Limit: " + comments.toString() + " isnt a number")
    }

    const link = "https://www.googleapis.com/youtube/v3/commentThreads?key=" + process.env["GOOGLE"] + "&part=snippet,id&videoId=" + videoId + "&maxResults=" + comments 
    const webby = (await axios.get(link))["data"]["items"]

    const arr = webby.map((e) => {
        const name = e["snippet"]["topLevelComment"]["snippet"]["authorDisplayName"]
        const message = e["snippet"]["topLevelComment"]["snippet"]["textOriginal"]

        return name + ": " + message
    })

    const app = initializeApp({
        apiKey: process.env["FIREBASE"],
        authDomain: "factchecker-e23f1.firebaseapp.com",
        projectId: "factchecker-e23f1",
        storageBucket: "factchecker-e23f1.firebasestorage.app",
        messagingSenderId: "348870466635",
        appId: "1:348870466635:web:06467997b4cbdbb46781ce",
        measurementId: "G-FC7SGGDW38"
    });

    const functions = getFunctions(app, 'us-central1');

    const scamFlower = httpsCallable(functions, "generateCheck")
    
    const response = await scamFlower({title: videoWebby["title"] + " About " + videoWebby["description"], source: search_data, videoCreator: videoWebby["channelTitle"], comments: arr})

    return res.status(200).send(response)
})