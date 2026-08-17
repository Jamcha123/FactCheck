import axios from 'axios'


export default class FactCheck{
    constructor(options = {customerUID: "empty"}){
        this.customerUID = options.customerUID
    }

    async getCheckout(){
        const link = "https://addcheckoutlink-z2v6b6ghoq-uc.a.run.app"
        const webby = (await axios.get(link))["data"]

        return webby 
    }

    async getUsage(){
        if(this.customerUID == "empty"){
            throw new Error("customerUID is empty in the new FactCheck({customerUID: 'Your Customer UID'})\nYou can get your customer UID by subscribing to the FactCheck API for $0.05 per API call")
        }

        const link = "https://getusage-z2v6b6ghoq-uc.a.run.app?customer=" + this.customerUID

        try{
            const webby = (await axios.get(link))["data"]
            return webby
        } catch (err) {
            return err
        }
    }

    async cancelSubscription(){
        if(this.customerUID == "empty"){
            throw new Error("customerUID is empty in the new FactCheck({customerUID: 'Your Customer UID'})\nYou can get your customer UID by subscribing to the FactCheck API for $0.05 per API call")
        }

        const link = "https://cancelsubscription-z2v6b6ghoq-uc.a.run.app?customer=" + this.customerUID

        try{
            const webby = (await axios.get(link))["data"]
            return webby
        } catch (err) {
            return err
        }
    }

    async getFactChecker(youtubeId, maxComments){
        if(this.customerUID == "empty"){
            throw new Error("customerUID is empty in the new FactCheck({customerUID: 'Your Customer UID'})\nYou can get your customer UID by subscribing to the FactCheck API for $0.05 per API call")
        }

        const link = "https://factcheck-z2v6b6ghoq-uc.a.run.app?customer=" + this.customerUID + "&videoId=" + youtubeId + "&comments=" + maxComments
        
        console.log("\nLoading..... Please Wait, Might Take Some Time\n")
        console.log("\n" + link + "\n")

        try {
            const webby = (await axios.get(link))["data"]
            return webby
        } catch (err) {
            return err
        }
    }
}
