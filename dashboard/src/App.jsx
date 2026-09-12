import { useState, useEffect, useCallback, useContext } from 'react'
import './App.css'
import $ from 'jquery'
import {motion} from 'framer-motion'
import {initializeApp} from 'firebase/app'
import {initializeAppCheck} from 'firebase/app-check'
import {getAI, getGenerativeModel} from 'firebase/ai'
import {deleteUser, getAuth, GithubAuthProvider, GoogleAuthProvider, linkWithPopup, onAuthStateChanged, reauthenticateWithPopup, signInAnonymously} from 'firebase/auth'
import {getFirestore, setDoc, getDoc, doc} from 'firebase/firestore'

const config = {
  apiKey: "",
  authDomain: "factchecker-e23f1.firebaseapp.com",
  projectId: "factchecker-e23f1",
  storageBucket: "factchecker-e23f1.firebasestorage.app",
  messagingSenderId: "348870466635",
  appId: "1:348870466635:web:1b10c40785b9d9e26781ce",
  measurementId: "G-HSX5W68LF0"
}

const app = initializeApp(config)

const auth = getAuth(app)
auth.useDeviceLanguage()

const addAnon = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    if(user == null){
      signInAnonymously(auth).then((value) => resolve(value.user.uid))
    }else{
      resolve(user.uid)
    }
  })
})

const getUser =  await addAnon

const google = new GoogleAuthProvider()

const github = new GithubAuthProvider()

const db = getFirestore(app)

const ai = getAI(app)

const model = getGenerativeModel(ai, {model: "gemini-3.8-flash", tools: [{googleSearch: {}}]})

function AddNavbar(){
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if(user.isAnonymous === false){
        document.getElementById("google").style.display = "none"
        document.getElementById("github").style.display = "none"
        document.getElementById("deletes").style.display = "flex"
      }else{
        document.getElementById("deletes").style.display = "none"
        document.getElementById("google").style.display = "flex"
        document.getElementById("github").style.display = "flex"
      }

      const isEmpty = (obj) => {
        return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
      };

      const usage = (await fetch("https://getbilling-z2v6b6ghoq-uc.a.run.app?user=" + auth.currentUser.uid)).json()

      const mini_usage = document.getElementById("mini_usage")

      if(isEmpty(await usage) === true){
        document.getElementById("unsubscribe").style.display = "none"
        document.getElementById("unsub_button").style.display = "none"
        document.getElementById("subscribe").style.display = "flex"
        document.getElementById("sub_button").style.display = "flex"
      }else{
        document.getElementById("mini_usage").innerText = "$" + Number.parseFloat(((await usage)["amount_due"]) / 100)
        document.getElementById("unsubscribe").style.display = "flex"
        document.getElementById("unsub_button").style.display = "flex"
        document.getElementById("subscribe").style.display = "none"
        document.getElementById("sub_button").style.display = "none"
      }
    })
  }, [])

  const [menu, setMenu] = useState(false)
  const [icon, setIcon] = useState(false)

  const reauth = async () => {
    const providerId = auth.currentUser.providerData[0]?.providerId;
    let provider

    if (providerId === "google.com") {
      provider = new GoogleAuthProvider();
    } else if (providerId === "github.com") {
      provider = new GithubAuthProvider();
    } else {
      throw new Error(`Unsupported provider for auto-reauth: ${providerId}`);
    }

        // 3. Open a popup to refresh their session token
    console.log(`Prompting reauthentication for: ${providerId}`);
    await reauthenticateWithPopup(auth.currentUser, provider)  
    
      // 4. Retry deleting the user now that the token is fresh
    await deleteUser(auth.currentUser);
    console.log("Account successfully deleted after social reauth.");
    window.location.reload()
  }

  return(
    <nav className="fixed top-0 left-0 w-full h-[3em] m-auto p-0 z-201 flex flex-row align-middle justify-center text-center ">
      <ul className="relative w-[50%] m-auto p-0 h-full bg-transparent gap-4 flex flex-row align-middle justify-start text-start ">
        <h1 className="text-3xl hidden text-white text-center font-medium md:flex flex-col align-middle justify-center ml-[2%] z-205 ">
          OurThinker
        </h1>
        <motion.div onClick={active? () => setActive(false) : () => setActive(true)} initial={{scale: 0.85}} whileHover={{scale: 0.95}} onMouseOver={() => setHover(true)} onMouseOut={() => setHover(false)} whileTap={{scale: 0.75}} className="relative w-[3em] min-w-[3em] m-auto ml-0 mr-0 z-205 p-0 bg-transparent h-full cursor-pointer rounded-2xl gap-2 flex flex-col align-middle justify-center text-center">
          <motion.div initial={{translateX: 0 + "%"}} animate={{translateX: hover? 10 + "%" : 0 + "%"}} transition={{type: "spring", duration: 1 + "%"}} className="relative w-full m-auto p-0 bg-white min-h-[0.3em] mt-0 mb-0 rounded-2xl "></motion.div>
          <motion.div initial={{translateX: 0 + "%"}} animate={{translateX: hover? -10 + "%" : 0 + "%"}} transition={{type: "spring", duration: 1 + "%"}} className="relative w-full m-auto p-0 bg-white min-h-[0.3em] mt-0 mb-0 rounded-2xl "></motion.div>
          <motion.div initial={{translateX: 0 + "%"}} animate={{translateX: hover? 10 + "%" : 0 + "%"}} transition={{type: "spring", duration: 1 + "%"}} className="relative w-full m-auto p-0 bg-white min-h-[0.3em] mt-0 mb-0 rounded-2xl "></motion.div>
        </motion.div>
        <h1 id="mini_usage" className="text-white text-3xl z-203 text-center flex flex-col align-middle justify-center ">
          $0.00
        </h1>
      </ul>
      <ul className="relative w-[50%] m-auto p-0 h-full bg-transparent flex flex-row align-middle justify-end text-end ">

      </ul>
      <motion.ul initial={{scaleX: 0, translateX: -100 + "%"}} animate={{scaleX: active? 1 : 0, translateX: active? 0 + "%" : -100 + "%"}} className="lists fixed top-0 left-0 z-201 w-[15em] min-h-screen m-auto p-0 bg-slate-950 flex flex-col align-middle overflow-y-auto ">
        <div className="relative w-full min-h-[3em] h-[3em] m-auto mt-0 mb-0 bg-transparent "></div>
        <div className="relative w-full min-h-[3em] h-[3em] m-auto mt-0 mb-0 bg-transparent ">
          <li className="relative w-[75%] h-full m-auto ml-[7.5%] p-0 bg-transparent flex flex-col align-middle justify-center text-start text-gray-300 text-xl ">Dashboard</li>
        </div>
        <div className="relative w-full min-h-[2.5em] h-[2.5em] m-auto mt-0 mb-0 bg-transparent ">
          <motion.li initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative w-[75%] h-full m-auto ml-[10%] p-0 shadow-xs shadow-white bg-gray-900 hover:bg-gray-950 rounded-full flex flex-col align-middle justify-center text-center text-white text-lg "><a href="#billing">Usage And Billing</a></motion.li>
        </div>
        <div className="relative w-full min-h-[3em] h-[3em] m-auto mt-[10%] mb-0 bg-transparent ">
          <li className="relative w-[75%] h-full m-auto ml-[7.5%] p-0 bg-transparent flex flex-col align-middle justify-center text-start text-gray-300 text-xl ">APIs Products</li>
        </div>
        <div className="relative w-full min-h-[2.5em] h-[2.5em] m-auto mt-0 mb-0 bg-transparent ">
          <motion.li initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative w-[75%] h-full m-auto ml-[10%] p-0 shadow-white shadow-xs bg-gray-900 hover:bg-gray-950 rounded-full flex flex-col align-middle justify-center text-center text-white text-lg "><a href="#thinker">Thinker API</a></motion.li>
        </div>
        <div className="relative w-full min-h-[2.5em] h-[2.5em] m-auto mt-[10%] mb-0 bg-transparent ">
          <motion.li initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative w-[75%] h-full m-auto ml-[10%] p-0 shadow-white shadow-xs bg-gray-900 hover:bg-gray-950 rounded-full flex flex-col align-middle justify-center text-center text-white text-lg "><a href="#chat">Thinker Chat</a></motion.li>
        </div>
        <div className="relative w-full min-h-[3em] h-[3em] m-auto mt-[10%] mb-0 bg-transparent ">
          <li className="relative w-[75%] h-full m-auto ml-[7.5%] p-0 bg-transparent flex flex-col align-middle justify-center text-start text-gray-300 text-xl ">Account And Subs</li>
        </div>
        <motion.button id="github" onClick={() => linkWithPopup(auth.currentUser, github).then((value) => window.location.reload()).catch((err) => alert(err))} initial={{scale: 1}} whileHover={{scale: 0.9}} whileTap={{scale: 1.1}} className="relative rounded-full w-[10em] h-[2.5em] min-h-[2.5em] mt-[10%] mb-0 text-lg cursor-pointer text-white text-center font-medium flex flex-col align-middle justify-center m-auto ml-[10%] p-0 bg-linear-30 from-lime-800 to-black ">
          Github Login
        </motion.button>
        <motion.button id="google" onClick={() => linkWithPopup(auth.currentUser, google).then((value) => window.location.reload()).catch((err) => alert(err))} initial={{scale: 1}} whileHover={{scale: 0.9}} whileTap={{scale: 1.1}} className="relative rounded-full w-[10em] h-[2.5em] min-h-[2.5em] mt-[10%] mb-0 text-lg cursor-pointer text-white text-center font-medium flex flex-col align-middle justify-center m-auto ml-[10%] p-0 bg-linear-30 from-lime-800 to-black ">
          Google Login 
        </motion.button>
        <motion.button id="unsubscribe" onClick={() => window.location.href = "https://cancelsubscription-z2v6b6ghoq-uc.a.run.app?user=" + auth.currentUser.uid} initial={{scale: 1}} whileHover={{scale: 0.9}} whileTap={{scale: 1.1}} className="relative rounded-full w-[10em] h-[2.5em] min-h-[2.5em] mt-[10%] mb-0 text-lg cursor-pointer text-white text-center font-medium flex flex-col align-middle justify-center m-auto ml-[10%] p-0 bg-linear-30 from-lime-800 to-black ">
          Unsubscribe 
        </motion.button>
        <motion.button id="subscribe" onClick={() => window.location.href = "https://api-checkout-z2v6b6ghoq-uc.a.run.app/?user=" + auth.currentUser.uid} initial={{scale: 1}} whileHover={{scale: 0.9}} whileTap={{scale: 1.1}} className="relative rounded-full w-[10em] h-[2.5em] min-h-[2.5em] mt-[10%] mb-0 text-lg cursor-pointer text-white text-center font-medium flex flex-col align-middle justify-center m-auto ml-[10%] p-0 bg-linear-30 from-lime-800 to-black ">
          Subscribe 
        </motion.button>
        <motion.button id="deletes" onClick={(e) => {e.preventDefault(); deleteUser(auth.currentUser).then((value) => {alert("Account Deleted"); window.location.reload()}).catch(async (err) => {await reauth()})}} initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} className="relative w-[10em] h-[2.5em] min-h-[2.5em] mt-[10%] mb-0 rounded-full m-auto ml-[10%] bg-linear-45 from-red-950 via-red-900 to-red-800 border-red-950 border-2 text-white text-xl font-medium cursor-pointer flex flex-col align-middle justify-center text-center ">
          Delete Account
        </motion.button>                
      </motion.ul>
    </nav>
  )
}
function AddDashboard(){
  useEffect(() => {
    const getKey = async () => {
      const key = (await getDoc(doc(db, "api_keys/" + auth.currentUser.uid))).get("data")
      if(key != null || key != undefined){
        document.getElementById("key").innerText = "API Key: " + key
        document.getElementById("sub_button").style.display = "none"
        document.getElementById("subscribe").style.display = "none"
      }
    }
    getKey()
    
    const getUsage = async () => {
      const usage_container = document.getElementsByClassName("usage_container")[0]
      const getUsage = (await getDoc(doc(db, "api_usages/" + auth.currentUser.uid))).get("data")

      if(getUsage == undefined || getUsage == null){
        return
      }


      let total = await (await fetch("https://getbilling-z2v6b6ghoq-uc.a.run.app?user=" + auth.currentUser.uid)).json()
      getUsage.forEach((e) => {
        const {name, price, date, description} = e

        const num = Number.parseFloat(price.split("$")[1])
        
        total += num

        const usage = document.createElement("div")
        usage.className = "usage relative w-full m-auto p-0 h-fit min-h-fit mt-0 mb-0 bg-transparent flex flex-row align-middle gap-2"
        usage_container.appendChild(usage)

        const parent_div1 = document.createElement("div")
        parent_div1.className = "name relative w-[20%] h-full p-0 m-auto bg-transparent flex flex-col align-middle justify-center text-center overflow-y-auto"
        usage.appendChild(parent_div1)

        const child_div1 = document.createElement("div")
        child_div1.className = "relative w-full h-fit m-auto mt-0 mb-0 bg-transparent flex flex-col align-middle justify-center text-center"
        parent_div1.appendChild(child_div1)

        const text1 = document.createElement("h1")
        text1.className = "text-start text-white text-xl underline underline-offset-2 ml-[1%]"
        text1.innerText = name
        child_div1.appendChild(text1)

        const parent_div2 = document.createElement("div")
        parent_div2.className = "date relative w-[20%] h-full p-0 m-auto bg-transparent flex flex-col align-middle justify-center text-center overflow-y-auto"
        usage.appendChild(parent_div2)

        const child_div2 = document.createElement("div")
        child_div2.className = "relative w-full h-fit m-auto mt-0 mb-0 bg-transparent flex flex-col align-middle justify-center text-center"
        parent_div2.appendChild(child_div2)

        const text2 = document.createElement("h1")
        text2.className = "text-start text-white text-xl underline underline-offset-2 ml-[1%]"
        text2.innerText = date
        child_div2.appendChild(text2)

        const parent_div3 = document.createElement("div")
        parent_div3.className = "description relative w-[40%] h-full p-0 m-auto bg-transparent flex flex-col align-middle justify-center text-center overflow-y-auto"
        usage.appendChild(parent_div3)

        const child_div3 = document.createElement("div")
        child_div3.className = "relative w-full h-fit m-auto mt-0 mb-0 bg-transparent flex flex-col align-middle justify-center text-center"
        parent_div3.appendChild(child_div3)

        const text3 = document.createElement("h1")
        text3.className = "text-start text-white text-xl underline underline-offset-2 ml-[1%]"
        text3.innerText = description
        child_div3.appendChild(text3)

        const parent_div4 = document.createElement("div")
        parent_div4.className = "price relative w-[20%] h-full p-0 m-auto bg-transparent flex flex-col align-middle justify-center text-center overflow-y-auto"
        usage.appendChild(parent_div4)

        const child_div4 = document.createElement("div")
        child_div4.className = "relative w-full h-fit m-auto mt-0 mb-0 bg-transparent flex flex-col align-middle justify-center text-center"
        parent_div4.appendChild(child_div4)

        const text4 = document.createElement("h1")
        text4.className = "text-start text-white text-xl underline underline-offset-2 ml-[1%]"
        text4.innerText = price
        child_div4.appendChild(text4)
      })

      document.getElementById("total").innerText = "$" + Number.parseFloat(total["amount_due"] / 100)
    }
    getUsage()

  }, [])
 
  const items = () => new Promise(async (resolve) => {
    const key = (await getDoc(doc(db, "api_keys/" + auth.currentUser.uid))).get("data")

    if(key != undefined || key != null){
      document.getElementById("keyDoc").innerText = "key: " + key
    }else{
      document.getElementById("keyDoc").innerText = "key: Subscribe To Get The Key" 
    }
  })
  
  items()

  useEffect(() => {
    const chatbot = document.getElementById("chatbot")

    const prompt = document.getElementById("prompt")
    const videoID = document.getElementById("videoId")

    const getItemTarget = async () => {
      let usage = (await getDoc(doc(db, "chat_usage/" + auth.currentUser.uid))).get("data")

      if(usage != null || usage != undefined){
        document.getElementById("total_chat_usage").innerText = "Total Usaga: " + usage; 
      }
    
    }

    getItemTarget()

    chatbot.addEventListener("submit", async (e) => {
      e.preventDefault(); 

      $("#chatbox").empty()

      document.getElementById("chatbox").innerText = "Loading..."

      let usage = (await getDoc(doc(db, "chat_usage/" + auth.currentUser.uid))).get("data")

      if(usage == null || usage == undefined){
        await setDoc(doc(db, "chat_usage/" + auth.currentUser.uid), {
          data: 0
        })
      }

      usage = (await getDoc(doc(db, "chat_usage/" + auth.currentUser.uid))).get("data")

      if(auth.currentUser.isAnonymous === false || auth.currentUser.isAnonymous === true){
        if(usage >= 5){
          try{
            const usage = (await fetch("https://us-central1-factchecker-e23f1.cloudfunctions.net/addUsage?user=" + auth.currentUser.uid)).json()
            console.log(await usage)
          } catch(err) {
            alert("Du Här Nått Sin Grattis Användning För OurThinker\nLogin And Subscribed To OurThinker Chat pay as you go for $0.05 per call/prompt")
            return
          }
        } 
      }

      usage += 1

      await setDoc(doc(db, "chat_usage/" + auth.currentUser.uid), {
        data: usage
      })

      document.getElementById("total_chat_usage").innerText = "Total Usage: " + usage

      const url = 'https://gettranscript-z2v6b6ghoq-uc.a.run.app?videoId=' + videoID.value;
      const result = await (await fetch(url)).json()

      const {response, stream} = await model.generateContentStream({
        contents: [{
          role: "user", 
          parts: [
            {text: "Frågan" + prompt.value + " Om Detta Videon Transkript: " + result["transcript"] + " och all webb sökningen: " + (result["search"]).join("\n\n") + " med samma språk som youtube Video typ engelska med en engelsk transkript och svenska med en svensk transkript och etc (max 300 ord med en . och / i slutet av varje meningen)"}
          ]
        }], 
        tools: [{googleSearch: {}}]
      })

      $("#chatbox").empty()
      let ans = ""
      for await (const chunk of stream){
        document.getElementById("chatbox").innerText = document.getElementById("chatbox").innerText + chunk.text()
        ans += chunk.text()
      }

      let ansText = ans.split("/").join("\n")

      document.getElementById("chatbox").innerText = ansText
    })
  }, [])
  return(
    <div className="container relative w-[95%] rounded-t-2xl max-h-full h-full mt-[2%] m-auto p-0 flex flex-col align-middle overflow-y-hidden ">
      <div id="billing" className="relative w-full m-auto min-h-full h-full p-0 bg-transparent mt-0 mb-0 gap-10 flex flex-col align-middle overflow-y-auto ">
        <div className="relative w-[95%] h-fit m-auto mt-[15%] md:mt-[10%] lg:mt-[5%] mb-0 p-0 bg-transparent gap-2 flex flex-col align-middle justify-start text-start ">
          <h1 id="total" className="text-white text-start text-5xl">
            $0.00
          </h1>
          <p className="text-lg text-start text-white">
            ($0.05 Per API Request, Billed Weekly, No Fixed Cost, Just $0.05 Per Usage)
          </p>
          <h1 className="text-white text-3xl text-start mt-[2%] ">
            OurThinker Billing And Usage
          </h1>
          <div className="relative w-full h-fit z-200 m-auto mt-[2%] p-0 bg-transparent flex flex-row align-middle justify-start text-start gap-5 ">
            <motion.button initial={{scale: 1}} whileTap={{scale: 1.1}} whileHover={{scale: 0.9}} id="sub_button" onClick={(e) => {e.preventDefault(); window.location.href = "https://api-checkout-z2v6b6ghoq-uc.a.run.app/?user=" + auth.currentUser.uid}} className="relative w-[12em] md:w-[9em] h-[2em] min-h-[2em] m-auto ml-0 mr-0 p-0 text-white text-xl flex flex-col align-middle justify-center text-center max-h-[2em] bg-linear-45 from-lime-950 to-lime-800 rounded-full hover:scale-[1.1] duration-300 transition-all active:scale-[0.9] cursor-pointer ">
              Subscribe
            </motion.button>
            <motion.button initial={{scale: 1}} whileTap={{scale: 1.1}} whileHover={{scale: 0.9}} id="unsub_button" onClick={(e) => {e.preventDefault(); window.location.href = "https://cancelsubscription-z2v6b6ghoq-uc.a.run.app?user=" + auth.currentUser.uid}} className="relative w-[12em] md:w-[9em] h-[2em] min-h-[2em] m-auto ml-0 mr-0 p-0 text-white text-xl flex flex-col align-middle justify-center text-center max-h-[2em] bg-linear-45 from-lime-950 to-lime-800 rounded-full hover:scale-[1.1] duration-300 transition-all active:scale-[0.9] cursor-pointer ">
              Unsubscribe
            </motion.button>
            <p id="key" className="text-xl text-white text-center flex flex-col align-middle justify-center ">
              API Key: Subscribe To Get Your API Key
            </p>
          </div>
        </div>
        <div className="usage_container relative w-[95%] max-h-[75%] h-[75%] m-auto p-0 bg-transparent mt-0 mb-0 flex flex-col align-middle gap-2 overflow-y-auto ">
          <h1 className="text-3xl text-white text-start mt-[5%] ">
            API Usage History 
          </h1>
          <div className="usage relative w-full m-auto p-0 h-fit min-h-fit mt-0 mb-0 bg-transparent flex flex-row align-middle gap-2 ">
            <div className="name relative w-[20%] h-full p-0 m-auto bg-transparent flex flex-col align-middle overflow-y-auto ">
              <div className="relative w-full h-[3em] m-auto mt-0 mb-0 bg-transparent flex flex-col align-middle justify-center text-center ">
                <h1 className="text-start text-white text-xl underline underline-offset-2 ml-[1%] ">Name</h1>
              </div>
            </div>
            <div className="date relative w-[20%] h-full p-0 m-auto bg-transparent flex flex-col align-middle overflow-y-auto ">
              <div className="relative w-full h-[3em] m-auto mt-0 mb-0 bg-transparent flex flex-col align-middle justify-center text-center ">
                <h1 className="text-start text-white text-xl underline underline-offset-2 ml-[1%] " >Date</h1>
              </div>
            </div>
            <div className="description relative w-[40%] h-full p-0 m-auto bg-transparent flex flex-col align-middle overflow-y-auto ">
              <div className="relative w-full h-[3em] m-auto mt-0 mb-0 bg-transparent flex flex-col align-middle justify-center text-center ">
                <h1 className="text-start text-white text-xl underline underline-offset-2 ml-[1%] " >Description</h1>
              </div>
            </div>
            <div className="price relative w-[20%] h-full p-0 m-auto bg-transparent flex flex-col align-middle overflow-y-auto ">
              <div className="relative w-full h-[3em] m-auto mt-0 mb-0 bg-transparent flex flex-col align-middle justify-center text-center ">
                <h1 className="text-start text-white text-xl underline underline-offset-2 ml-[1%] " >Price</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="thinker" className="relative w-full m-auto min-h-full h-full p-0 bg-transparent mt-0 mb-0 flex flex-col align-middle ">
        <div className="relative w-[90%] h-[20%] m-auto mt-[15%] md:mt-[10%] lg:mt-[5%] mb-0 p-0 bg-transparent flex flex-col align-middle justify-center text-center ">
          <h1 className="text-white text-center text-3xl font-medium">
            OurThinker Introduction
          </h1>
        </div>
        <div className="relative w-[85%] h-[80%] m-auto mt-0 mb-0 p-0 bg-transparent flex flex-col align-middle overflow-y-auto overflow-x-hidden gap-4 ">
          <h1 className="text-xl text-white text-start ml-[5%] ">
            Youtube Critical Thinker API Link
          </h1>
          <div className="relative w-[90%] min-h-[5em] m-auto mt-0 mb-0 p-0 flex flex-col align-middle justify-center text-center bg-black rounded-2xl shadow-xs shadow-gray-600 ">
            <pre className="relative w-[95%] h-full m-auto p-0 bg-transparent flex flex-row align-middle text-center justify-center text-white text-xl " >
              <p className="relative w-[75%] h-full m-auto p-0 bg-transparent flex flex-col align-middle justify-center text-start overflow-x-auto ">
                https://youtube-thinker-z2v6b6ghoq-uc.a.run.app
              </p>
              <motion.button onClick={async (e) => {e.preventDefault(); window.navigator.clipboard.writeText("https://youtube-thinker-z2v6b6ghoq-uc.a.run.app?key=" + ((await getDoc(doc(db, "api_keys/" + auth.currentUser.uid))).get("data")) + "&videoId=A Youtube Video ID").then((value) => alert("Youtube thinker link copied to dashboard"))}} className="relative w-[7em] min-w-[7em] m-auto p-0 h-[2.5em] bg-slate-900 cursor-pointer rounded-full flex flex-col align-middle justify-center text-center ">
                Copy Link
              </motion.button>
            </pre>
          </div>
          <div className="relative w-[90%] min-h-[5em] m-auto mt-0 mb-0 p-0 flex flex-col align-middle justify-center text-center bg-black rounded-2xl shadow-xs shadow-gray-600 ">
            <pre className="relative w-[95%] h-[90%] m-auto p-0 bg-transparent overflow-x-auto justify-center flex flex-col align-middle text-start text-white text-xl " >
              curl https://youtube-thinker-z2v6b6ghoq-uc.a.run.app?key=your api key&videoId=a youtube video ID
            </pre>
          </div>
          <div className="relative w-[90%] min-h-[10em] m-auto mt-0 mb-0 p-0 overflow-x-auto bg-black rounded-2xl shadow-xs shadow-gray-600 flex flex-col align-middle justify-center text-center gap-5 ">
            <h1 className="text-start text-xl text-white ml-[2%] ">
              Query Parameters
            </h1>
            <pre id="keyDoc" className="text-start text-xl text-white ml-[2%] ">
              key: 
            </pre>
            <pre className="text-start text-xl text-white ml-[2%] ">
              videoId: Qa06ZzquP6E 
            </pre>
          </div>
        </div>
      </div>
      <div id="chat" className="relative w-full m-auto min-h-full h-full p-0 bg-transparent mt-0 mb-0 flex flex-col align-middle justify-end text-end gap-5 overflow-y-auto ">
        <pre className="relative text-xl text-white font-medium text-center h-[60%] m-auto mt-[10%] md:mt-[5%] p-0 w-[95%] bg-transparent flex flex-col align-middle " id="chatbox">
        </pre>
        <form className="relative w-[95%] m-auto h-[12em] min-h-[12em] mt-0 mb-0 p-0 rounded-2xl shadow-xs shadow-black flex flex-col align-middle " method="GET" id="chatbot" action="">
          <input type="text" id="videoId" required placeholder="Enter A Video Id" className="relative w-full h-[28%] mt-0 mb-0 m-auto p-0 bg-black rounded-t-2xl flex flex-col align-middle justify-center text-center text-lg text-white " />
          <input type="text" id="prompt" required placeholder="Ask Question About The Video" className="relative w-full h-[28%] mt-0 mb-0 m-auto p-0 bg-black flex flex-col align-middle justify-center text-center text-lg text-white " />
          <motion.button type="submit" id="submit" initial={{scale: 1}} whileTap={{scale: 1.1}} whileHover={{scale: 0.9}} className="relative w-[7em] h-[2em] rounded-full m-auto p-0 cursor-pointer bg-slate-950 shadow-black shadow-xs text-center text-xl text-white ">
            Submit 
          </motion.button>
        </form>
        <h1 className="text-center text-2xl text-white font-medium mb-0 mt-0 flex flex-row align-middle justify-center gap-1 ">
          OurThinker Chat <p className="hidden md:block"> - Ask Any Question About A Youtube Video</p>
        </h1>
        <h1 id="total_chat_usage" className="text-2xl text-white text-center mt-0 mb-[5%] font-medium">
          Total Usage: 0
        </h1>
      </div>
    </div>
  )
}

export default function App(){
  return(
    <div className="relative w-full h-full m-auto p-0 bg-transparent flex flex-col align-middle justify-center text-center ">
      <AddNavbar></AddNavbar>
      <AddDashboard></AddDashboard>
    </div>
  )
}
