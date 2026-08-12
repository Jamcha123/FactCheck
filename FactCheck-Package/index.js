import axios from 'axios'


export default class FactCheck{
    constructor(options = {userkey: null}){
        this.userkey = options.userkey
    }

    async getLogin(email, password){
        const link = "https://adduser-z2v6b6ghoq-uc.a.run.app?email=" + email + "&password=" + password
        
        try{
            const webby = (await axios.get(link))["data"]
            return webby
        } catch(err) {
            return err
        }
    }

    async getCheckout(){
        const link = "https://addcheckout-z2v6b6ghoq-uc.a.run.app?user=" + this.userkey
        return link
    }

    async getUsage(){
        const link = "https://getusage-z2v6b6ghoq-uc.a.run.app?user=" + this.userkey

        try{
            const webby = (await axios.get(link))["data"]
            return webby
        } catch (err) {
            return err
        }
    }

    async cancelSubscription(){
        const link = "https://cancelsubscription-z2v6b6ghoq-uc.a.run.app?user=" + this.userkey

        try{
            const webby = (await axios.get(link))["data"]
            return webby
        } catch (err) {
            return err
        }
    }

    async removeUser(){
        const link = "https://removeuser-z2v6b6ghoq-uc.a.run.app?user=" + this.userkey

        try{
            const webby = (await axios.get(link))["data"]
            return webby
        } catch (err) {
            return err
        }
    } 

    async getFactChecker(youtubeId, maxComments){
        const link = "https://factcheck-z2v6b6ghoq-uc.a.run.app?user=" + this.userkey + "&videoId=" + youtubeId + "&comments=" + maxComments
        
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