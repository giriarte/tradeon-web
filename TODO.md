# Tradeon Web — TODO

## In Progress
- [ ]

## Pending
- [ ] Add authZ/authN (with Cognito?)


- [ ] Create domain in Route53
- [ ] Configure SES to send email instead of using SNS
- [ ] Configure SMS messages to send through SMS instead of using SNS (for phone alerts) 
- [ ] Update the notification, send to the selected communication channel 
- [ ] Add signup email confirmation and forgot password functionality


- [ ] Add subscription model 
- [ ] Add payments processing 


- [ ] Improve home page 
  - [ ] Add terms and conditions
  - [ ] Add Contact Us
  - [ ] Update context menu, Add the 3 lines for expanidble context menu and remove the static titles from the top bar (except Logout and user profile)
  - [ ] Add footer with terms and conditions, contact us, about us
  - [ ] Other cosmetic improvements for the home page

- Create LLC 
- [ ] Implement Adds (for free version) 

- [ ] Deploy Express server to Lambda 
- [ ] Deploy front to CloudFront 
- [ ] Testing and bug fixes 
- [ ] Launch 

## Done
- [x] Backend Express app boilerplate (`server/index.js`)
- [x] Strategy management page (`src/pages/StrategyManagement.jsx`)
- [x] Webapp skeleton: Home, UserProfile, UserMock
- [x] Deploy the updated lambda with the new set of indicators. Test that everything works fine. Then commit the backend to the repo.
- [x] Create USERS_USERID_GSI GSI on the CDK project, for the userId attribute (plus delete the one that was manually created in the DDB)
- [x] Update notification subject. Include the pair for which the strategy is triggered.
- [x] Adjust indicators with the params that are stored in DDB. Possibly delete the defaultParams field 
- [x] Read the candleInterval from the strategy object, and use it on the process.
- [x] Load all of the available indicators from the code into the config file
- [x] Alerts history section
- [x] Update notification cooldown period.
- [x] Add Login and Signup pages.
