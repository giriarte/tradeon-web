# Tradeon Web — TODO

## In Progress
- [ ]

## Pending
- [ ] Add Login and Signup pages. (Friday 3)
- [ ] Add authZ/authN (with Cognito?) (Sat 4)
- [ ] Add signup email confirmation and forgot password functionality (Sun 5)


- [ ] Create domain in Route53 (Mon 6)
- [ ] Configure SES to send email instead of using SNS (Mon 6 / Tue 7)
- [ ] Configure SMS messages to send through SMS instead of using SNS (for phone alerts) (Wed 8)
- [ ] Update the notification, send to the selected communication channel (Thu 9)

- [ ] Add subscription model (Friday 10 / Saturday 11 / Sunday 12)
- [ ] Add payments processing (Monday 13 / Tuesday 14)


- [ ] Improve home page (Wed 15 / Friday 17)
  - [ ] Add terms and conditions
  - [ ] Add Contact Us
  - [ ] Update context menu, Add the 3 lines for expanidble context menu and remove the static titles from the top bar (except Logout and user profile)
  - [ ] Add footer with terms and conditions, contact us, about us
  - [ ] Other cosmetic improvements for the home page

- Create LLC (Saturday 18 / Sunday 19 / Monday 20)
- [ ] Implement Adds (for free version) (Tuesday 21 / Wednesday 22)

- [ ] Deploy Express server to Lambda (Thursday 23 / Friday 24)
- [ ] Deploy front to CloudFront (Saturday 25)
- [ ] Testing and bug fixes (Sunday 26 / Thursday 30)
- [ ] Launch (Thursday May 1st)

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
