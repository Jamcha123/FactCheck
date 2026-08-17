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
import {Supadata} from '@supadata/js'

dotenv.config()
admin.initializeApp()

const stripe = new Stripe(process.env["STRIPE"])

const models = genkit({
    plugins: [googleAI({apiKey: process.env["GEMINI"]})], 
    model: googleAI.model("gemini-3.6-flash")
})

export const addCheckoutLink = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {

    const session = await stripe.checkout.sessions.create({
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

    return res.status(200).send(session.url)
})

export const addCheckout = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {

    const session = await stripe.checkout.sessions.create({
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

    const obj = { 
        active: true, 
        description: "Subscribed To FactCheck Pay As You Go",
        customer: getCheckoutSession.customer, 
    }

    const updateCustomer = await stripe.customers.update(getCheckoutSession.customer, {metadata: obj})
    
    return res.status(200).send({"customer": "Your Customer UID Is " + getCheckoutSession.customer + ", Save It Somewhere Safe", "UID": getCheckoutSession.customer, "customer": updateCustomer})
})

export const getUsage = functions.https.onRequest({cors: true}, async (req, res) => {
    const {customer} = req.query

    const get_customers = (await stripe.customers.list()).data

    const obj = []
    for(let i = 0; i != get_customers.length; i++){
        const getCustomerUID = get_customers[i].id
        if(getCustomerUID == customer){
            obj.push(get_customers[i])
            break
        }
    }

    const subscription = (await stripe.subscriptions.list({
        customer: obj[0].id, 
        status: "active", 
    }))

    const subscriptionId = subscription.data[0].id

    const getBilling = await stripe.invoices.createPreview({
        customer: obj[0].id, 
        subscription: subscriptionId
    })

    res.status(200).send({"amount": "Amount Billed This Week: $" + (Number.parseFloat(getBilling.amount_due / 100)).toString(), "invoice": getBilling})
    return res.end()
})

export const cancelSubscription = functions.https.onRequest({cors: true}, async (req, res) => {
    const {customer} = req.query

    try{
        const customers = await (await stripe.customers.list()).data

        let obj = []
        for(let i = 0; i != customers.length; i++){
            if(customers[i].id == customer){
                obj.push(customers[i])
                break
            }
        }

        if (obj.length == 0){
            return res.status(200).send(customer + " customer UID is not found or doesn't exist")
        }

        const subscription = await stripe.subscriptions.list({
            customer: obj[0].id, 
            status: "active"
        })

        const deleteSub = await stripe.subscriptions.cancel(subscription.data[0].id)

        return res.status(200).send({summary: "Your subscription is now canceled", config: deleteSub})   
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
                comment: z.string().describe("The Orginal Comment"),
                sources: z.array(z.object({title: z.string("The Title Of The Source"), link: z.string().describe("The Website Link")})).describe("The List Of News Sources"), 
                pro: z.array(z.string().describe("A 15 Word Pro Argument For The Comment")).describe("The List Of 3 Pro Comment Arguments"), 
                anti: z.array(z.string().describe("A 15 Word Anti Argument For The Comment")).describe("The List Of 3 Anti Comment Arguments") 
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
                        comment: z.string().describe("The Orginal Comment"),
                        sources: z.array(z.object({title: z.string("The Title Of The Source"), link: z.string().describe("The Website Link")})).describe("The List Of News Sources"), 
                        pro: z.array(z.string().describe("A 15 Word Pro Argument For The Comment")).describe("The List Of 3 Pro Comment Arguments"), 
                        anti: z.array(z.string().describe("A 15 Word Anti Argument For The Comment")).describe("The List Of 3 Anti Comment Arguments") 
                    })
                ).describe("List Of Every Comments")
            })
        }
    })
    return response.output
})

export const generateCheck = onCallGenkit(
    {
        memory: "1GiB",
        timeoutSeconds: 300
    },

    scamFlow
)

export const factCheck = functions.https.onRequest({cors: true, timeoutSeconds: 3600, memory: "1GiB"}, async (req, res) => {
    const {customer, videoId, comments} = req.query

    const customerList = (await stripe.customers.list()).data

    let obj = []
    for(let i = 0; i != customerList.length; i++){
        if(customerList[i].id == customer){
            obj.push(customerList[i])
            break
        }
    }
    
    if(obj.length == 0){
        return res.status(200).send(customer + ", customer UID not found or customer doesnt exist")
    }

    const usageEventPlus = await stripe.billing.meterEvents.create({
        event_name: "scamhunt_usage", 
        payload: {
            value: "1",
            stripe_customer_id: obj[0].id
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

    const searcher_data = new Promise(async (resolve) => {
        try{
            const search_webby = (await axios.get(url, {headers: headers, params: {"q": videoWebby["title"]}}))["data"]["web"]["results"]
            const search_data = (search_webby.slice(0, 12).map((e) => {return e["title"] + " - " + e["url"] + " - " + e["description"]})).join("\n")
            resolve(search_data)
        } catch(err) {
            resolve("error, no web sources found or websites found")
        }
    })

    const search_data = await searcher_data

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

    return res.status(200).send(response.data)
})

const inputSchema = z.object({
    videoId: z.string().describe("Den Youtube Videon ID"), 
})

const outputSchema = z.object({
    title: z.string().describe("The Title Of The Youtube Video"), 
    summary: z.array(z.string().describe("Några poänger som videon ta upp i en lite sammafattning som är minst 10 ord per poäng")).describe("Lista Av Alla 5 poäng sammafattade lista"), 
    pro: z.array(z.string().describe("En pro kort argument för videon")).describe("Lista Av 5 kort pro argument poäng för videon"),
    anti: z.array(z.string().describe("En emot kort argument för videon")).describe("Lista Av 5 kort emot argument poäng för videon"),
    content: z.array(z.string().describe("Meningar eller premisener som saknar eller missar context, är missvisande, är fel eller saknar nyans och sa om det är sant eller fel eller behövs nyans och förklara lite varför och utgå från sök källor så att jag kan förstår")).describe("Lista Av Alla Meningar som är fel eller saknar context")
})

const videoFlow = await models.defineFlow({
    name: "videoFlow",
    inputSchema: inputSchema, 
    outputSchema: outputSchema
}, async (input) => {
    const videoLink = "https://www.googleapis.com/youtube/v3/videos?key=" + process.env["GOOGLE"] + "&part=snippet&id=" + input.videoId
    const videoWebby = (await axios.get(videoLink))["data"]["items"][0]["snippet"]

    const title = videoWebby["title"] + " About " + videoWebby["description"] + " Made By " + videoWebby["channelTitle"]

    const url = "https://api.search.brave.com/res/v1/web/search?q=" + videoWebby["title"]

    const headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": process.env["BRAVE"]
    }

    const searcher_data = new Promise(async (resolve) => {
        try{
            const search_webby = (await axios.get(url, {headers: headers, params: {"q": videoWebby["title"]}}))["data"]["web"]["results"]
            const search_data = (search_webby.slice(0, 25).map((e) => {return e["title"] + " - " + e["url"] + " - " + e["description"]})).join("\n")
            resolve(search_data)
        } catch(err) {
            resolve("error, no web sources found or websites found")
        }
    })

    const search_data = await searcher_data

    const supadata = new Supadata({
        apiKey: process.env["SUPADATA"],
    });

    const transcriptResult = await supadata.transcript({
        url: "https://www.youtube.com/watch?v=" + input.videoId,
        text: true,
    });

    const prompt = "Summera Detta Youtube Video: " + title + " och sök källor: " + search_data + " med detta transcript: " + transcriptResult.content + " (respon i samma språk som video="
    
    const {output} = await models.generate({
        model: googleAI.model("gemini-3.6-flash"),
        prompt: prompt, 
        output: {
            schema: outputSchema
        }
    })

    return output
})

export const videoChecker = onCallGenkit(
    {
        memory: "4GiB", 
        timeoutSeconds: 3600
    },
    videoFlow
)


export const videoCallSummary = functions.https.onRequest({cors: true, memory: "4GiB", timeoutSeconds: 3600}, async (req, res) => {
    const {customer, videoId} = req.query

    const customerList = (await stripe.customers.list()).data

    let obj = []
    for(let i = 0; i != customerList.length; i++){
        if(customerList[i].id == customer){
            obj.push(customerList[i])
            break
        }
    }

    if(obj.length == 0){
        return res.status(200).send(customer + " customer UID is not found or doesnt exist")
    }

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

    const videoFlow = httpsCallable(functions, "videoChecker")

    const response = (await videoFlow({videoId: videoId})).data

    return res.status(200).send(response)
})