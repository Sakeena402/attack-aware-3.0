import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export default client;

//this file is for twilio configuration, we will use this client to send sms in our campaignController.ts 
// file made by hifza. We will import this client in campaignController.ts and use it to send sms to employees as part of our phishing simulation campaigns.
