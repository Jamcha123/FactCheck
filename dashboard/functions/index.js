import * as functions from 'firebase-functions'
import admin from 'firebase-admin'
import Stripe from 'stripe'
import dotenv from 'dotenv'
import {randomBytes} from 'crypto'
import {googleAI} from '@genkit-ai/google-genai'
import {genkit, z} from 'genkit'
import {httpsCallable, getFunctions} from 'firebase/functions'
import axios from 'axios'
import {initializeApp} from 'firebase/app'

dotenv.config()

const firebaseConfig = {
  apiKey: process.env["GOOGLE"],
  authDomain: "factchecker-e23f1.firebaseapp.com",
  projectId: "factchecker-e23f1",
  storageBucket: "factchecker-e23f1.firebasestorage.app",
  messagingSenderId: "348870466635",
  appId: "1:348870466635:web:1b10c40785b9d9e26781ce",
  measurementId: "G-HSX5W68LF0"
};

const app = initializeApp(firebaseConfig)

admin.initializeApp()

const db = admin.firestore()

const stripe = new Stripe(process.env["STRIPE"])

const model = genkit({
    model: googleAI.model("gemini-3.5-flash", {
        temperature: 0.8, 
        googleSearchRetrieval: true
    }),

    plugins: [googleAI({apiKey: process.env["GEMINI"]})]
})

export const api_checkout = functions.https.onRequest({cors: true}, async (req, res) => {
    const {user} = req.query

    const session = await stripe.checkout.sessions.create({
        metadata: {user: user},
        line_items: [
            {
                price: "price_1UATZaIjUuQYDWzWL7OIlFXR", 
            }
        ], 
        currency: "usd", 
        mode: "subscription", 
        success_url: "https://us-central1-factchecker-e23f1.cloudfunctions.net/api_add_client?token={CHECKOUT_SESSION_ID}", 
        cancel_url: "https://factchecker-e23f1.web.app", 
        automatic_tax: {enabled: true}, 
        tax_id_collection: {enabled: true}
    })

    return res.redirect(301, session.url)
})

export const api_add_client = functions.https.onRequest({cors: true}, async (req, res) => {
    const {token} = req.query

    const get_checkout = await stripe.checkout.sessions.retrieve(token)

    const getUser = get_checkout.metadata.user
    
    let ans;
    try{
        
        const checkUser = await admin.auth().getUser(getUser)

        if(checkUser.uid == getUser){
            ans = checkUser.uid
        }

    } catch(err){
        return res.status(200).send(err)
    }

    const keyToken = Buffer.concat([Buffer.from(ans, "utf-8"), Buffer.from(get_checkout.customer, "utf-8")]).toString("utf-8")

    const updateClient = await stripe.customers.update(get_checkout.customer, {
        metadata: {
            user: ans, 
            key: "sk" + keyToken.toString()
        }
    })

    await db.collection("api_keys").doc(getUser).set({data: "sk" + keyToken.toString()})
    await db.collection("api_usages").doc(getUser).set({data: []})

    return res.redirect(301, "https://factchecker-e23f1.web.app")
})
 

const inputSchema = z.object({
    title: z.string().describe("The Title Of The Video"), 
    transcript: z.array(z.string().describe("Sammafattning")).describe("Lista Av Alla Sammafattningar")
})

const outputSchema = z.object({
    description: z.string().describe("Beskrivningen Av Den Video (10 ord max)"), 
})

const descriptionFlow = model.defineFlow({
    name: "descriptionFlow", 
    inputSchema: inputSchema,
    outputSchema: outputSchema
}, async (input) => {
    const prompt = "Skriv En Kort Beskrivning/Sammafattningar Av " + input.transcript.map((e) => {return e}).join("\n") + " I Samma Språk Som Transcripten Till Exampel Om I Transkript Är I Engelska Skriv I Engelska, Samma Med Alla Språk"

    const {output} = await model.generate({
        prompt: prompt, 
        output: {
            schema: outputSchema
        }
    })

    return output
})

export const youtube_thinker = functions.https.onRequest({cors: true}, async (req, res) => {
    const {key, videoId} = req.query

    let customer;
    let client; 
    let user; 
    try{
        (await stripe.customers.list()).data.map((e) => {if(e.metadata.key == key){client = key; customer = e.id; user = e.metadata.user; return}})

    } catch(err) {
        return res.status(200).send(err)
    }

    if(client == undefined || client == null){
        return res.status(200).send(key + " is the wrong API key")
    }

    await stripe.billing.meterEvents.create({
        event_name: "factcheck",
        payload: {
            stripe_customer_id: customer,
            value: "1"
        }
    })

    try{
        const link = "https://transcriptapi.com/api/v2/youtube/transcript?video_url=" + videoId + "&format=json"

        const webby = ((await axios.get(link, {headers: {Authorization: "Bearer " + process.env["YOUTUBE"]}}))["data"]["transcript"]).map((e) => {return e["text"]}).join("")

        const videoSummary = httpsCallable(getFunctions(app), "videoChecker")

        const videoFlow = (await videoSummary({videoId: videoId, transcript: webby})).data

        const target = await videoFlow

        const getDescription = await descriptionFlow({title: target.title, transcript: target.summary})
        
        target["description"] = getDescription.description
        target["price"] = "$0.05"
        target["date"] = new Date().toISOString()

        const data = (await db.collection("api_usages").doc(user).get()).get("data")

        data.push({name: videoId, description: target["description"], price: target["price"], date: target["date"]})

        await db.collection("api_usages").doc(user).set({data: data})

        return res.status(200).send(target)
    } catch(err) {
        return res.status(200).send(err)
    }
})

export const getTranscript = functions.https.onRequest({cors: true}, async (req, res) => {
    const {videoId} = req.query

    const videoLink = "https://www.googleapis.com/youtube/v3/videos?key=" + process.env["TUBELINK"] + "&id=" + videoId + "&part=snippet,id"
    const videoWebby = (await (await fetch(videoLink)).json())["items"][0]["snippet"]

    // 1. Combine the title and description
    const rawQuery = `${videoWebby["title"]}`;
    
    // 2. Limit the length (e.g., first 1000 characters) to avoid "URL too long" errors
    const truncatedQuery = rawQuery
    
    // 3. Properly encode the string for a URL query parameter
    let url = "https://api.search.brave.com/res/v1/llm/context?count=30&q=" + encodeURIComponent(truncatedQuery);
    
    const headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": process.env["BRAVE"]
    }

    const target = await (await fetch(url, {headers: headers})).json()

    const searchWebby = ((await axios.get(url, {headers: headers}))["data"]["grounding"]["generic"]).map((e) => {return e["title"] + " - " + (e["snippets"]).map((e) => {return e}).join(" - ") + " : " + e["url"]}).join("/-")

    url = 'https://transcriptapi.com/api/v2/youtube/transcript?video_url=' + videoId + '&format=json';
    const result = await (await fetch(url, { headers: { Authorization: 'Bearer ' + process.env["YOUTUBE"]} })).json()

    const transcript = result["transcript"].map((e) => {return e["text"]}).join("")
    
    res.status(200).send({"title": videoWebby["title"] + " - " + videoWebby["description"], "transcript": transcript, "search": searchWebby.split("/-")})
    return res.end()
})

export const deleteSub = functions.https.onRequest({cors: true}, async (req, res) => {
    const {user} = req.query

    let userAns
    try{
        const userResponse = await admin.auth().getUser(user)
        userAns = userResponse.uid
    } catch(err) {
        return res.status(500).send(err)
    }


    let clientAns
    try {
        const getCustomer = (await stripe.customers.list()).data.map((e) => {if(e.metadata.user == userAns){clientAns = e.id; return}})
    } catch(err) {
        return res.status(500).send(err)
    }

    try{
        const clientTarget = (await stripe.customers.del(clientAns)).object
        return res.status(200).send(clientTarget)
    } catch(err) {
        return res.status(200).send(err)
    }
})

export const addUsage = functions.https.onRequest({cors: true}, async (req, res) => {
    const {user} = req.query

    let userAns
    try{
        const userResponse = await admin.auth().getUser(user)
        userAns = userResponse.uid
    } catch(err) {
        return res.status(500).send(err)
    }

    let clientAns
    try {
        const getCustomer = (await stripe.customers.list()).data.map((e) => {if(e.metadata.user == userAns){clientAns = e.id; return}})
    } catch(err) {
        return res.status(500).send(err)
    }

    const usage = await stripe.billing.meterEvents.create({
        event_name: "factcheck", 
        payload: {
            stripe_customer_id: clientAns, 
            value: "1"
        }
    })

    return res.status(200).send(usage)
})

export const getBilling = functions.https.onRequest({cors: true}, async (req, res) => {
    const {user} = req.query

    let userAns
    try{
        const userResponse = await admin.auth().getUser(user)
        userAns = userResponse.uid
    } catch(err) {
        return res.status(500).send(err)
    }

    let clientAns
    try {
        const getCustomer = (await stripe.customers.list()).data.map((e) => {if(e.metadata.user == userAns){clientAns = e.id; return}})
            
        const subscription = (await stripe.subscriptions.list({status: "active", customer: clientAns})).data

        const bill = (await stripe.invoices.createPreview({
            customer: clientAns, 
            subscription: subscription[0].id, 
        }))

        return res.status(200).send(bill)
    } catch(err) {
        return res.status(500).send(err)
    }
})