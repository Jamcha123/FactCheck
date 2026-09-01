***Powered By Supadata***

**Get 100 Free API Requests (Build YouTube Apps) : [Supdata Website](https://supadata.ai/?ref=james*)* 

[![supadata banner](https://raw.githubusercontent.com/Jamcha123/FactCheck/refs/heads/main/FactCheck-Package/supadata.png)](https://supadata.ai/?ref=james)

# FactCheckJS - Fact Check Youtube And Become A Better Critical Thinker

FactCheckJS doesn't fact check Youtube videos e.g like True or False.

FactCheckJS gives your pro arguments for the video, anti arguments against the video, summary of the video and some context that the video missed.

FactCheckJS uses brave search api and gemini api to come up with some arguments for, against, a summary and context to back up or question some claims


***Issues***

Github Issues (If You Have An Issue With The Package): https://github.com/Jamcha123/FactCheck/issues


***Installation***

``` npm install factcheckjs ```


***Initialization***: 

``` import FactCheck from 'factcheckjs' ```

``` const obj = new FactCheck({customerUID: "Your Customer UID"}) ```


***Getting A Customer UID And Subscribing To FactCheck API ($0.05 Per API Call, No Payment Upfront)***: 
   
   ```const checkout = await obj.getCheckout()```
   
   ```console.log(checkout) //After you subscribe you have to put your customer UID in the new FactChect({customerUID: "Your Customer UID You Got From Subscribing"})```

   ``` const obj = new FactCheck({customerUID: "Add Your Customer UID"}) ``` 


***Main Function (new FactCheck({customerUID: "Your Customer UID"}))***: 

   ```
      const getFactCheck = await obj.getFactChecker(youtubeId, maxComments) 
      
      console.log(getFactCheck) //A Function For Creating Pro And Anti Arguments About Youtube Comments (It Takes Some Time To Response)
   ```

   ```
      const getVideoSummarizer = await obj.getVideoSummarizer(youtubeVideoId)
   
      console.log(getVideoSummarizer) //A Function For Creating Pro And Anti Arguments About The Youtube Video And A Quick Summary And Some Context If Needed  (It Takes Some Time To Response)
   ```

***Response (Comment)***

   ```
      comments: [
         {
           name: [String],
           comment: [String],
           sources: [ [Object], [Object] ],
           pro: [
             [String], 
             [String], 
             [String], 
           ],
           anti: [
             [String], 
             [String], 
             [String], 
           ]
         },
      ]
   ```
   

***Optional Functions (new FactCheck({userkey: "Your UID Needed"}))***:

   ```
      const getUsage = await obj.getUsage()
      console.log(getUsage) //Get Your Current Usage And How Much To Pay Per Week 
   ```

   ```
      const cancelSubscription = await obj.cancelSubscription()
      console.log(cancelSubscription) //Cancel Your Subscription
   ```


