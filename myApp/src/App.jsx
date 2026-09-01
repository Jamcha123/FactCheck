import { useState, useEffect, useCallback, useContext } from 'react'
import './App.css'
import * as THREE from 'three'
import {motion} from 'framer-motion'
import $ from 'jquery'
import {httpsCallable, getFunctions, httpsCallableFromURL} from 'firebase/functions'
import {initializeApp} from 'firebase/app'
import {getAuth, onAuthStateChanged, signInAnonymously} from 'firebase/auth'
import {getAI, getGenerativeModel} from 'firebase/ai'
import {getDoc, getFirestore, getDocs, doc, setDoc} from 'firebase/firestore'
import {fetchTranscript, YoutubeTranscript} from 'youtube-transcript'
import supadata from './assets/supadata.png'
import axios from 'axios'

const config = {
  apiKey: "",
  authDomain: "factchecker-e23f1.firebaseapp.com",
  projectId: "factchecker-e23f1",
  storageBucket: "factchecker-e23f1.firebasestorage.app",
  messagingSenderId: "348870466635",
  appId: "1:348870466635:web:06467997b4cbdbb46781ce",
  measurementId: "G-FC7SGGDW38"
}

const app = initializeApp(config)

const ai = getAI(app)
const getQuestion = getGenerativeModel(ai, {model: "gemini-3.7-flash", tools: [{googleSearch: {}}]})

const auth = getAuth(app)
auth.useDeviceLanguage()

const db = getFirestore(app)

const createUID = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    if(user != null){
      resolve(user.uid)
    }else{
      const getAnon = await signInAnonymously(auth)
      const getAnonTarget = getAnon.user.uid

      resolve(getAnonTarget)
    }
  })
})

await createUID

function Addbackground(){
  return(
    <div className="fixed top-0 left-0 z-1 w-full h-full m-auto p-0 bg-transparent grid grid-cols-3 grid-rows-3 gap-1 ">
      <motion.div initial={{scaleX: 1.2}} className="relative w-full h-full m-auto p-0 bg-black "></motion.div>
      <motion.div initial={{scaleX: 0.8}} className="relative w-full h-full m-auto p-0 bg-black "></motion.div>
      <motion.div initial={{scaleX: 1.2}} className="relative w-full h-full m-auto p-0 bg-black "></motion.div>
      <motion.div initial={{scaleX: 1.2}} className="relative w-full h-full m-auto p-0 bg-black "></motion.div>
      <motion.div initial={{scaleX: 0.8}} className="relative w-full h-full m-auto p-0 bg-black "></motion.div>
      <motion.div initial={{scaleX: 1.2}} className="relative w-full h-full m-auto p-0 bg-black "></motion.div>
      <motion.div initial={{scaleX: 1.2}} className="relative w-full h-full m-auto p-0 bg-black "></motion.div>
      <motion.div initial={{scaleX: 0.8}} className="relative w-full h-full m-auto p-0 bg-black "></motion.div>
      <motion.div initial={{scaleX: 1.2}} className="relative w-full h-full m-auto p-0 bg-black "></motion.div>
    </div>
  )
}

function Addinput(){
  useEffect(() => {
    const form = document.getElementById("form")
    const prompt = document.getElementById("prompt")

    window.localStorage.setItem("videoFactCheck", "")

    form.addEventListener("submit", async (e) => {
      e.preventDefault()

      $("pre").empty()

      let get_usage = (await getDoc(doc(db, "free_usage/" + auth.currentUser.uid))).get("amount")

      if(get_usage == null || get_usage == undefined){
        setDoc(doc(db, "free_usage/" + auth.currentUser.uid), {
          amount: Number.parseInt(0)
        })
      }

      get_usage = (await getDoc(doc(db, "free_usage/" + auth.currentUser.uid))).get("amount")
      console.log(get_usage)

      if(get_usage >= 5){
        const add_usage = (await axios.get("https://addclientusage-z2v6b6ghoq-uc.a.run.app?user=" + auth.currentUser.uid))["data"]
        if(add_usage == "customer, not found"){
          alert("Free Usage Limit Of 5 Has Been Reached\nYou Can Buy Unlimited For $0.05 Per Usage")
          return
        }
      }

      get_usage = get_usage + 1

      
      await setDoc(doc(db, "free_usage/" + auth.currentUser.uid), {
        amount: Number.parseInt(get_usage)
      })

      console.log(get_usage)

      const summary1 = document.getElementById("summary")
      const pro1 = document.getElementById("pro")
      const anti1 = document.getElementById("anti")
      const context1 = document.getElementById("context")

      const pre = document.getElementsByTagName("pre")
      for(let i = 0; i != pre.length; i++){
        pre[i].innerText = "Loading..."
      }

      const results = (await axios.get("https://getvideotranscript-z2v6b6ghoq-uc.a.run.app/?videoId=" + prompt.value))["data"]

      const getVideoChecker = httpsCallable(getFunctions(app), "videoChecker")
      const {title, summary, pro, anti, context} = (await getVideoChecker({videoId: prompt.value, transcript: results})).data

      window.localStorage.setItem("videoFactCheck", title + "\nsummary: " + summary.map((e) => {return e}).join(" - ") + "\npro arguments: " + pro.map((e) => {return e}).join(" - ") + "\nanti arguments: " + anti.map((e) => {return e}).join(" - ") + "\ncontext: " + context.map((e) => {return e}).join(" - ") + "\ntranscript: " + results)

      $("pre").empty()

      summary1.innerText = title + "\n\n" + summary.map((e) => {return e}).join("\n\n")
      pro1.innerText = title + "\n\n" + pro.map((e) => {return e}).join("\n\n")
      anti1.innerText = title + "\n\n" + anti.map((e) => {return e}).join("\n\n")
      context1.innerText = title + "\n\n" + context.map((e) => {return e}).join("\n\n")

      return 
    })

    const questForm = document.getElementById("questForm")
    const questPrompt = document.getElementById("questPrompt")

    questForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      $("#questions").empty()

      let get_usage = (await getDoc(doc(db, "free_usage/" + auth.currentUser.uid))).get("amount")

      if(get_usage == null || get_usage == undefined){
        setDoc(doc(db, "free_usage/" + auth.currentUser.uid), {
          amount: Number.parseInt(0)
        })
      }
      
      get_usage = (await getDoc(doc(db, "free_usage/" + auth.currentUser.uid))).get("amount")
      console.log(get_usage)

      if(get_usage >= 5){
        const add_usage = (await axios.get("https://addclientusage-z2v6b6ghoq-uc.a.run.app?user=" + auth.currentUser.uid))["data"]
        if(add_usage == "customer, not found"){
          alert("Free Usage Limit Of 5 Has Been Reached\nYou Can Buy Unlimited For $0.05 Per Usage")
          return
        }
      }
      
      get_usage = get_usage + 1
      
      await setDoc(doc(db, "free_usage/" + auth.currentUser.uid), {
        amount: Number.parseInt(get_usage)
      })

      console.log(get_usage)

      document.getElementById("questions").innerText = "Loading..."

      const getVideoMemory = window.localStorage.getItem("videoFactCheck")

      if(getVideoMemory == ""){
        $("#questions").empty()
        document.getElementById("questions").innerText = "You Haven't entered a video id since there isnt a transcript"
      } 

      const {response, stream} = await getQuestion.generateContentStream(questPrompt.value + ", Här är video argumention, sammafattningen och video beskrivningerna av videon: " + getVideoMemory + " och sluta varje meningen med en /, (skriv i samma språk som videon e.g om i svenska, skriv svenska och om i engelska, skriv engelska och etc)")

      $("#questions").empty()

      let ans = ""
      for await (const chunk of stream){
        document.getElementById("questions").innerText = document.getElementById("questions").innerText + chunk.text().toString()
        ans += chunk.text().toString()
      }

      ans = ans.split("/").join("\n\n")
      document.getElementById("questions").innerText = ans

      return 
    })

    const items = document.getElementsByClassName("items")
    for(let i = 0; i != items.length; i++){
      items[i].style.display = "none"
    }
    items[0].style.display = "flex"
  }, [])

  const items = document.getElementsByClassName("items")
  const getItems = (index) => {
    for(let i = 0; i != items.length; i++){
      items[i].style.display = "none"
    }
    items[index].style.display = "flex"
  }

  const checkoutTarget = async () => {
    let ans; 
    try{
      const link = "https://getclientusage-z2v6b6ghoq-uc.a.run.app?user=" + auth.currentUser.uid.toString()
      const webby = (await axios.get(link))["data"]

      ans = webby
      console.log(ans)
    } catch(err) {
      console.log(err)
      return
    }


    if(ans["customer"]["metadata"]["user"] != auth.currentUser.uid){
      document.getElementById("checkout").style.display = "flex"
      document.getElementById("usage").style.display = "none"
    }else{
      document.getElementById("checkout").style.display = "none"
      document.getElementById("usage").style.display = "block"
      document.getElementById("usage").innerText  = "Total Spent: $" + Number.parseFloat(ans["invoice"]["amount_due"] / 100).toString()
    }
  }
  checkoutTarget()

  return(
    <div className="relative w-full h-full z-2 m-auto p-0 bg-transparent flex flex-col align-middle justify-center text-center gap-2 ">
      <div className="relative w-[75%] h-[10%] m-auto p-0 bg-transparent flex flex-col align-middle justify-center text-center ">
        <h1 className="text-3xl text-white text-center font-semibold z-300 ">FactCheck - Youtube Critical Thinker</h1>
      </div>
      <div className="relative w-[75%] h-[60%] m-auto p-0 bg-transparent flex flex-col align-middle overflow-y-hidden overflow-x-hidden ">
        <div className="relative w-full min-h-full h-fit max-h-fit m-auto mt-0 mb-0 p-0 items flex flex-col align-middle rounded-2xl ">
          <h1 className="text-2xl text-white font-medium text-center mt-[2%] " >Summary Of The Video</h1>
          <div className="relative w-[90%] max-w-[90%] overflow-x-auto h-[15%] m-auto p-0 bg-transparent flex flex-row align-middle justify-start text-start gap-5 ">
            <motion.button onClick={() => getItems(0)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-slate-900 text-white text-md font-light cursor-pointer rounded-xl ">
              Summary
            </motion.button>
            <motion.button onClick={() => getItems(1)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Pro Arguments
            </motion.button>
            <motion.button onClick={() => getItems(2)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Anti Arguments
            </motion.button>
            <motion.button onClick={() => getItems(3)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Missing Context
            </motion.button>
            <motion.button onClick={() => getItems(4)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Ask AI
            </motion.button>
          </div>
          <pre id="summary" className="text-start text-white text-xl font-medium relative w-[90%] h-[65%] m-auto p-0 bg-transparent overflow-x-auto ">

          </pre>
        </div>
        <div className="relative w-full min-h-full h-fit max-h-fit m-auto mt-0 mb-0 p-0 items flex flex-col align-middle rounded-2xl ">
          <h1 className="text-2xl text-white font-medium text-center mt-[2%] " >Pro Arguments Of The Video</h1>
          <div className="relative w-[90%] max-w-[90%] overflow-x-auto h-[15%] m-auto p-0 bg-transparent flex flex-row align-middle justify-start text-start gap-5 ">
            <motion.button onClick={() => getItems(0)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Summary
            </motion.button>
            <motion.button onClick={() => getItems(1)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-slate-900 text-white text-md font-light cursor-pointer rounded-xl ">
              Pro Arguments
            </motion.button>
            <motion.button onClick={() => getItems(2)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Anti Arguments
            </motion.button>
            <motion.button onClick={() => getItems(3)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Missing Context
            </motion.button>
            <motion.button onClick={() => getItems(4)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Ask AI
            </motion.button>
          </div>
          <pre id="pro" className="text-start text-white text-xl font-medium relative w-[90%] h-[65%] m-auto p-0 bg-transparent overflow-x-auto ">
            
          </pre>
        </div>
        <div className="relative w-full min-h-full h-fit max-h-fit  m-auto mt-0 mb-0 p-0 items flex flex-col align-middle rounded-2xl ">
          <h1 className="text-2xl text-white font-medium text-center mt-[2%] " >Anti Arguments Of The Video</h1>
          <div className="relative w-[90%] max-w-[90%] overflow-x-auto h-[15%] m-auto p-0 bg-transparent flex flex-row align-middle justify-start text-start gap-5 ">
            <motion.button onClick={() => getItems(0)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Summary
            </motion.button>
            <motion.button onClick={() => getItems(1)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Pro Arguments
            </motion.button>
            <motion.button onClick={() => getItems(2)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-slate-900 text-white text-md font-light cursor-pointer rounded-xl ">
              Anti Arguments
            </motion.button>
            <motion.button onClick={() => getItems(3)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Missing Context
            </motion.button>
            <motion.button onClick={() => getItems(4)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Ask AI
            </motion.button>
          </div>
          <pre id="anti" className="text-start text-white text-xl font-medium relative w-[90%] h-[65%] m-auto p-0 bg-transparent overflow-x-auto">
            
          </pre>
        </div>
        <div className="relative w-full min-h-full h-fit max-h-fit  m-auto mt-0 mb-0 p-0 items flex flex-col align-middle rounded-2xl ">
          <h1 className="text-2xl text-white font-medium text-center mt-[2%] ">Search Missing Context To The Video</h1>
          <div className="relative w-[90%] max-w-[90%] overflow-x-auto h-[15%] m-auto p-0 bg-transparent flex flex-row align-middle justify-start text-start gap-5 ">
            <motion.button onClick={() => getItems(0)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Summary
            </motion.button>
            <motion.button onClick={() => getItems(1)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Pro Arguments
            </motion.button>
            <motion.button onClick={() => getItems(2)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Anti Arguments
            </motion.button>
            <motion.button onClick={() => getItems(3)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-slate-900 text-white text-md font-light cursor-pointer rounded-xl ">
              Missing Context
            </motion.button>
            <motion.button onClick={() => getItems(4)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Ask AI
            </motion.button>
          </div>
          <pre id="context" className="text-start text-white text-xl font-medium relative w-[90%] h-[65%] m-auto p-0 bg-transparent overflow-x-auto ">
            
          </pre>
        </div>
        <div className="relative w-full min-h-full h-fit max-h-fit m-auto mt-0 mb-0 p-0 items flex flex-col align-middle rounded-2xl ">
          <h1 className="text-2xl text-white font-medium text-center mt-[2%] " >Ask Any Question</h1>
          <div className="relative w-[90%] max-w-[90%] overflow-x-auto h-[15%] m-auto p-0 bg-transparent flex flex-row align-middle justify-start text-start gap-5 ">
            <motion.button onClick={() => getItems(0)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Summary
            </motion.button>
            <motion.button onClick={() => getItems(1)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Pro Arguments
            </motion.button>
            <motion.button onClick={() => getItems(2)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Anti Arguments
            </motion.button>
            <motion.button onClick={() => getItems(3)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-black text-white text-md font-light cursor-pointer rounded-xl ">
              Missing Context
            </motion.button>
            <motion.button onClick={() => getItems(4)} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative shadow-xs shadow-white w-[9em] min-w-[9em] h-[2.5em] m-auto ml-0 mr-0 p-0 bg-slate-900 text-white text-md font-light cursor-pointer rounded-xl ">
              Ask AI
            </motion.button>
          </div>
          <pre id="questions" className="text-start text-white text-xl font-medium relative w-[90%] h-[50%] max-h-[50%] m-auto p-0 bg-transparent overflow-x-hidden overflow-y-auto wrap-break-word">

          </pre>
          <form id="questForm" action="" className="relative w-[75%] h-[4em] m-auto rounded-2xl p-0 bg-black z-99 flex flex-row align-middle justify-center text-center ">
            <input id="questPrompt" required type="text" placeholder="Enter A Question " className="relative outline-0 w-[75%] h-full m-auto p-0 bg-transparent flex flex-col align-middle justify-center text-center text-xl text-white " />
            <div className="relative w-[25%] h-full m-auto p-0 bg-transparent flex flex-col align-middle justify-center text-center ">
              <motion.button initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} type="submit" className="relative w-[6em] h-[2.5em] m-auto cursor-pointer p-0 bg-slate-950 shadow-white shadow-xs rounded-2xl flex flex-col align-middle justify-center text-center text-xl text-white ">
                Submit
              </motion.button>
            </div>
          </form>
        </div>
      </div>
      <form id='form' action="" className="relative z-201 w-[75%] h-[8em] m-auto p-0 rounded-2xl shadow-xs shadow-slate-500 flex flex-col align-middle justify-center text-center  ">
        <input id='prompt' required type="text" placeholder="Enter A Youtube Video ID" className="relative w-full outline-0 h-[75%] m-auto p-0 bg-transparent flex flex-col align-middle justify-center text-center text-xl text-white " />
        <div className="flex flex-row align-middle justify-center text-center relative w-fit m-auto p-0 bg-transparent h-fit gap-8 mb-[0.5%]">
          <motion.button initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} type="submit" className="relative w-[7em] h-[2.2em] m-auto mb-[1%] cursor-pointer p-0 bg-slate-950 shadow-xs shadow-white rounded-2xl flex flex-col align-middle justify-center text-center text-xl text-white ">
            Submit
          </motion.button>
        </div>
      </form>
      <div className="relative z-201 w-[75%] h-[4em] m-auto p-0 flex flex-col align-middle justify-center text-center  " >
        <motion.button id="checkout" onClick={(e) => {e.preventDefault(); window.location.href = 'https://checkout-z2v6b6ghoq-uc.a.run.app?user=' + auth.currentUser.uid}} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} type="button" className="relative w-[15em] h-[2.2em] m-auto mb-[1%] cursor-pointer p-0 bg-slate-950 shadow-xs shadow-white rounded-2xl flex flex-col align-middle justify-center text-center text-xl text-white ">
          Buy FactCheck Unlimited 
        </motion.button>
        <h1 id="usage" className="text-xl text-white font-medium ">Total Dollars Spent: </h1>
      </div>
    </div>
  )
}

export default function App(){
  return(
    <div className="relative w-full h-screen min-h-screen m-auto p-0 bg-transparent flex flex-col align-middle overflow-y-auto ">
      <Addbackground></Addbackground>
      <Addinput></Addinput>
      <div className="fixed top-0 z-200 left-0 w-fit h-[12em] m-auto p-0 hidden md:flex flex-row align-middle justify-start text-start ">
        <div className="relative z-200 w-fit h-full m-auto ml-[0.2%] mr-0 p-0 flex flex-col align-middle justify-center text-center  ">
          <a className="relative w-full h-[80%] m-auto p-0 bg-transparent cursor-pointer " href="https://supadata.ai/?ref=james">
            <img src={supadata} className="relative w-full h-full m-auto p-0 bg-transparent cursor-pointer " alt="" />
          </a>
          <h1 className="text-2xl text-white font-medium text-start ">
            Powered By Supadata
          </h1>
        </div>
      </div>
    </div>
  )
}
