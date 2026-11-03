// backend/scripts/seedIrpPlaybooks.ts
//
// Run with:  npx tsx scripts/seedIrpPlaybooks.ts
// (from the backend/ folder, with your .env already configured)
//
// Idempotent: matches on title + scope 'global', so running it twice
// never creates duplicates. Re-running also refreshes the content below.

import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../src/config/database.js';
import { Playbook } from '../src/models/Playbook.js';
import type {
  IPlaybookPhase,
  IPlaybookResource,
  PlaybookSeverity,
} from '../src/models/Playbook.js';

interface SeedPlaybook {
  title: string;
  category: string;
  severity: PlaybookSeverity;
  linkedCategories: string[];
  phases: IPlaybookPhase[];
  resources: IPlaybookResource[];
}

const PLAYBOOKS: SeedPlaybook[] = [
  {
    title: 'Phishing Account Compromise',
    category: 'Phishing',
    severity: 'high',
    linkedCategories: ['phishing'],
    phases: [
      {
        title: 'Identify',
        steps: [
          { description: 'Check for unknown logins, password change emails, or unfamiliar sent emails.', owner: 'Employee' },
          { description: 'Note which link you clicked and what details you entered.', owner: 'Employee' },
          { description: 'Report to IT/security immediately. Do not wait to be sure.', owner: 'Employee' },
        ],
      },
      {
        title: 'Contain',
        steps: [
          { description: 'Change your password right now from a safe device.', owner: 'Employee' },
          { description: 'Log out of all active sessions and devices.', owner: 'Employee' },
          { description: 'Disable the compromised account until it is checked.', owner: 'Admin' },
          { description: 'Change the same password anywhere else you used it.', owner: 'Employee' },
        ],
      },
      {
        title: 'Eradicate',
        steps: [
          { description: 'Delete the phishing email and block the sender.', owner: 'IT' },
          { description: 'Check mailbox rules for hidden auto-forwarding and remove them.', owner: 'IT' },
          { description: 'Run a full malware scan on the device.', owner: 'IT' },
          { description: 'Check whether the same email reached other employees.', owner: 'Admin' },
        ],
      },
      {
        title: 'Recover',
        steps: [
          { description: 'Re-enable the account with a new strong password.', owner: 'Admin' },
          { description: 'Turn on two-factor authentication (2FA).', owner: 'Employee' },
          { description: 'Watch the account for unusual activity for the next 30 days.', owner: 'IT' },
        ],
      },
      {
        title: 'Lessons Learned',
        steps: [
          { description: 'Write a short report: what happened, when, and what was exposed.', owner: 'Admin' },
          { description: 'Flag the employee for follow-up phishing training.', owner: 'Admin' },
          { description: 'Warn the whole team about this specific email.', owner: 'Admin' },
        ],
      },
    ],
    resources: [
      { title: 'CISA: Phishing Guidance, Stopping the Attack Cycle at Phase One', link: 'https://www.cisa.gov/resources-tools/resources/phishing-guidance-stopping-attack-cycle-phase-one', type: 'article' },
      { title: 'FTC: How to Recognize and Avoid Phishing Scams', link: 'https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams', type: 'article' },
    ],
  },
  {
    title: 'Ransomware Infection',
    category: 'Malware',
    severity: 'critical',
    linkedCategories: [],
    phases: [
      {
        title: 'Identify',
        steps: [
          { description: 'Look for locked files, changed file extensions, or a ransom note on screen.', owner: 'Employee' },
          { description: 'Do not click anything or pay anything. Take a photo of the screen.', owner: 'Employee' },
          { description: 'Call IT/security immediately by phone.', owner: 'Employee' },
        ],
      },
      {
        title: 'Contain',
        steps: [
          { description: 'Disconnect the device from Wi-Fi and unplug the network cable.', owner: 'Employee' },
          { description: 'Do not turn the device off unless IT tells you to.', owner: 'Employee' },
          { description: 'Isolate affected devices and shared drives from the network.', owner: 'IT' },
          { description: 'Disable the affected user accounts.', owner: 'Admin' },
        ],
      },
      {
        title: 'Eradicate',
        steps: [
          { description: 'Identify which systems and files are affected.', owner: 'IT' },
          { description: 'Find how the malware got in (email, download, unpatched system).', owner: 'IT' },
          { description: 'Wipe and rebuild infected devices. Do not just clean them.', owner: 'IT' },
        ],
      },
      {
        title: 'Recover',
        steps: [
          { description: 'Restore data from clean, offline backups only.', owner: 'IT' },
          { description: 'Reset all passwords, starting with admin accounts.', owner: 'IT' },
          { description: 'Bring systems back one by one and monitor each closely.', owner: 'IT' },
        ],
      },
      {
        title: 'Lessons Learned',
        steps: [
          { description: 'Write an incident report with a timeline and the cost of downtime.', owner: 'Admin' },
          { description: 'Fix the entry point (patching, email filtering, backups).', owner: 'IT' },
          { description: 'Run a team briefing and update training.', owner: 'Admin' },
        ],
      },
    ],
    resources: [
      { title: 'CISA: #StopRansomware Guide', link: 'https://www.cisa.gov/stopransomware/ransomware-guide', type: 'article' },
    ],
  },
  {
    title: 'Smishing (SMS) Attack',
    category: 'Smishing',
    severity: 'medium',
    linkedCategories: ['smishing'],
    phases: [
      {
        title: 'Identify',
        steps: [
          { description: 'Look for texts with urgent warnings, unknown senders, or odd links.', owner: 'Employee' },
          { description: 'Note whether you tapped the link or replied to the message.', owner: 'Employee' },
          { description: 'Take a screenshot of the message and report it to IT/security.', owner: 'Employee' },
        ],
      },
      {
        title: 'Contain',
        steps: [
          { description: 'Do not reply and do not tap any more links in the message.', owner: 'Employee' },
          { description: 'If you entered a password or code, change it now from a safe device.', owner: 'Employee' },
          { description: 'If you installed anything from the link, turn on airplane mode and tell IT.', owner: 'Employee' },
          { description: 'Disable the account if login details were entered.', owner: 'Admin' },
        ],
      },
      {
        title: 'Eradicate',
        steps: [
          { description: 'Block the sender number and delete the message.', owner: 'Employee' },
          { description: 'Scan the phone for unwanted apps and remove anything unknown.', owner: 'IT' },
          { description: 'Check whether other employees received the same text.', owner: 'Admin' },
        ],
      },
      {
        title: 'Recover',
        steps: [
          { description: 'Reset passwords for any account that may have been exposed.', owner: 'Employee' },
          { description: 'Turn on two-factor authentication (2FA) on those accounts.', owner: 'Employee' },
          { description: 'Watch the accounts for unusual activity for the next 30 days.', owner: 'IT' },
        ],
      },
      {
        title: 'Lessons Learned',
        steps: [
          { description: 'Write a short report: what the text said and what was done.', owner: 'Admin' },
          { description: 'Warn the whole team about this type of text.', owner: 'Admin' },
          { description: 'Flag the employee for follow-up smishing training if they tapped the link.', owner: 'Admin' },
        ],
      },
    ],
    resources: [
      { title: 'FTC: How to Recognize and Avoid Phishing Scams (emails and texts)', link: 'https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams', type: 'article' },
    ],
  },
  {
    title: 'Vishing (Phone Call) Attack',
    category: 'Vishing',
    severity: 'high',
    linkedCategories: ['vishing'],
    phases: [
      {
        title: 'Identify',
        steps: [
          { description: 'Watch for callers who rush you, claim to be IT, a bank, or a manager, and ask for codes or passwords.', owner: 'Employee' },
          { description: 'Write down what you shared, the caller number, and the time of the call.', owner: 'Employee' },
          { description: 'Report the call to IT/security right away, even if you shared nothing.', owner: 'Employee' },
        ],
      },
      {
        title: 'Contain',
        steps: [
          { description: 'Hang up. Do not call back on the number the caller gave you.', owner: 'Employee' },
          { description: 'If you shared a password or OTP, change it immediately.', owner: 'Employee' },
          { description: 'Disable the affected account until it is checked.', owner: 'Admin' },
          { description: 'If money or gift cards were requested, stop the payment and tell your manager.', owner: 'Employee' },
        ],
      },
      {
        title: 'Eradicate',
        steps: [
          { description: 'Review recent logins on the affected accounts and log out unknown sessions.', owner: 'IT' },
          { description: 'Block the caller number where possible.', owner: 'IT' },
          { description: 'Check whether other employees received similar calls.', owner: 'Admin' },
        ],
      },
      {
        title: 'Recover',
        steps: [
          { description: 'Re-enable the account with a new strong password.', owner: 'Admin' },
          { description: 'Turn on two-factor authentication (2FA).', owner: 'Employee' },
          { description: 'Watch the account and any related payments for the next 30 days.', owner: 'IT' },
        ],
      },
      {
        title: 'Lessons Learned',
        steps: [
          { description: 'Write a short report: who called, what they asked, and what was shared.', owner: 'Admin' },
          { description: 'Remind everyone: IT never asks for OTPs or passwords over the phone.', owner: 'Admin' },
          { description: 'Flag the employee for follow-up vishing training if information was shared.', owner: 'Admin' },
        ],
      },
    ],
    resources: [
      { title: 'FTC: Phone Scams (PDF)', link: 'https://www.bulkorder.ftc.gov/system/files/publications/512a_phone_scams-508.pdf', type: 'document' },
      { title: 'FTC: 10 Things You Can Do to Avoid Fraud', link: 'https://consumer.ftc.gov/articles/0060-10-things-you-can-do-avoid-fraud', type: 'article' },
    ],
  },
];

async function seed(): Promise<void> {
  await connectDB();

  for (const pb of PLAYBOOKS) {
    // Match on title + scope 'global' so re-runs update instead of duplicating.
    await Playbook.updateOne(
      { title: pb.title, scope: 'global' },
      {
        $set: {
          title: pb.title,
          category: pb.category,
          severity: pb.severity,
          linkedCategories: pb.linkedCategories,
          phases: pb.phases,
          resources: pb.resources,
          scope: 'global',
          source: 'seeded',
        },
      },
      { upsert: true }
    );
    console.log(`✅ Seeded playbook: "${pb.title}"`);
  }

  const total = await Playbook.countDocuments({ scope: 'global' });
  console.log(`   Total global playbooks in DB: ${total}`);

  await disconnectDB();
  process.exit(0);
}

seed().catch((err: unknown) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});