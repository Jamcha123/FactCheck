# FactCheck - Youtube Comments Fact Checker

FactCheck Is A Youtube Bot That Uses Youtube's API, Genkit And Brave Search That Fact Checks Youtube Comments From The Web.

***How To Use***
1. Get A Login UID By Entering A Email And Password

2. Use Your UID To Run The Checkout Function (No Upfront Cost, Just $0.05 Per API Call)

3. Then After Checkout, It Adds Your User ID To Your Customer Metadata In Stripe (UID Is Used To Track How Much You Use And How Much You Pay)

4. Then After Subscribing You Can Use Your UID (You Should Store Your UID Token) To Fact Check Any Youtube Comments Section (p.s It Is Not Every Comment Only 25 Comments)  

***Pricing***
1. $0.05 Per API Call

2. No Upfront Cost

***REST API Function List (You Should Call The APIs In Order)***

1. ***https://adduser-z2v6b6ghoq-uc.a.run.app***

***Queries (?email=&password=)***

email: Your Email or hotmail Or Gmail 

password: Enter A Passcode Or Password



2. https://addcheckout-z2v6b6ghoq-uc.a.run.app

***Queries (?user=)***

user: Enter Your UID From The AddUser Function After You Logged In And Get Your UID



3. https://factcheck-z2v6b6ghoq-uc.a.run.app
   
***Queries (?user=&videoId=&comments=)***

user: Enter Your UID From The AddUser Function After You Subscribed Via The Checkout Function

videoId: Your Youtube Video Id

comments: How many Comments Do You Want To Fact Check Starting For Newest Aged To Oldest Aged Comment, Default Starting At 25



4. https://getusage-z2v6b6ghoq-uc.a.run.app

***Queries (?user=)*** 

user: Enter Your UID From The AddUser Function After You Subscribed Via The Checkout Function



5. https://removeuser-z2v6b6ghoq-uc.a.run.app

***Queries (?user=)***

user: Enter Your UID From The AddUser Function After You Subscribed Via The Checkout Function



6. https://cancelsubscription-z2v6b6ghoq-uc.a.run.app

***Queries (?user=)***

user: Enter Your UID From The AddUser Function After You Subscribed Via The Checkout Function

reference: https://monetag.com/?ref_id=tO3B