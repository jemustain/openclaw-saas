export type SkillTier = "free" | "starter" | "pro";
export type SkillCategory = "Productivity" | "Communication" | "Research" | "Home & Life" | "Creative";

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: SkillCategory;
  tier: SkillTier;
  popular: boolean;
  capabilities: string[];
  examples: string[];
}

export const CATEGORIES: SkillCategory[] = [
  "Productivity",
  "Communication",
  "Research",
  "Home & Life",
  "Creative",
];

export const TIER_LABELS: Record<SkillTier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
};

export const SKILLS: Skill[] = [
  {
    id: "email-management",
    name: "Email Management",
    description: "Checks your email and tells you what's important so you never miss a thing.",
    icon: "",
    category: "Communication",
    tier: "free",
    popular: true,
    capabilities: [
      "Scans your inbox and highlights urgent messages",
      "Summarizes long email threads in plain English",
      "Drafts replies you can review before sending",
      "Flags emails that need action by a deadline",
    ],
    examples: [
      "Check my email for anything urgent",
      "Summarize that long thread from Sarah",
      "Draft a polite reply saying I'll get back to them Monday",
    ],
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Keeps track of your schedule and reminds you what's coming up next.",
    icon: "",
    category: "Productivity",
    tier: "free",
    popular: true,
    capabilities: [
      "Shows your upcoming events at a glance",
      "Adds new events from natural language",
      "Alerts you before meetings so you're never late",
      "Finds open time slots when you need to schedule something",
    ],
    examples: [
      "What's on my calendar today?",
      "Schedule a dentist appointment for next Tuesday at 2pm",
      "When am I free this week for a 1-hour meeting?",
    ],
  },
  {
    id: "weather",
    name: "Weather",
    description: "Gives you the forecast so you know whether to grab an umbrella or sunscreen.",
    icon: "",
    category: "Home & Life",
    tier: "free",
    popular: false,
    capabilities: [
      "Current conditions for any location",
      "Hourly and weekly forecasts",
      "Severe weather alerts",
      "Packing suggestions for upcoming trips",
    ],
    examples: [
      "What's the weather like today?",
      "Will it rain this weekend in Seattle?",
      "What should I wear tomorrow?",
    ],
  },
  {
    id: "reminders",
    name: "Reminders",
    description: "Nudges you at the right time so nothing slips through the cracks.",
    icon: "",
    category: "Productivity",
    tier: "free",
    popular: true,
    capabilities: [
      "One-time and recurring reminders",
      "Natural language scheduling — just say when",
      "Nags you until you acknowledge it",
      "Works across all your connected channels",
    ],
    examples: [
      "Remind me to call Mom at 5pm",
      "Every Monday morning, remind me to submit my timesheet",
      "In 20 minutes, tell me to check the oven",
    ],
  },
  {
    id: "web-search",
    name: "Web Search",
    description: "Looks things up on the internet and gives you a clear, simple answer.",
    icon: "",
    category: "Research",
    tier: "free",
    popular: false,
    capabilities: [
      "Searches the web and summarizes what it finds",
      "Compares products, prices, and reviews",
      "Answers factual questions with sources",
      "Finds local businesses and services",
    ],
    examples: [
      "What are the best-rated air fryers under $100?",
      "Find me a good Italian restaurant nearby",
      "How long does it take to drive from Phoenix to LA?",
    ],
  },
  {
    id: "social-media",
    name: "Social Media Posting",
    description: "Helps you write and schedule posts across your social accounts.",
    icon: "",
    category: "Communication",
    tier: "starter",
    popular: true,
    capabilities: [
      "Drafts posts tailored to each platform",
      "Schedules posts for optimal engagement times",
      "Suggests hashtags and captions",
      "Keeps your posting consistent without the burnout",
    ],
    examples: [
      "Draft an Instagram caption for this photo of my garden",
      "Schedule a LinkedIn post for tomorrow morning",
      "What hashtags should I use for a homeschooling post?",
    ],
  },
  {
    id: "news-monitoring",
    name: "News Monitoring",
    description: "Watches the news for topics you care about and gives you the highlights.",
    icon: "",
    category: "Research",
    tier: "starter",
    popular: false,
    capabilities: [
      "Tracks topics and keywords you choose",
      "Daily or real-time news digests",
      "Filters out noise so you get signal",
      "Covers major outlets and niche sources",
    ],
    examples: [
      "What's happening in tech today?",
      "Any news about homeschooling laws in Arizona?",
      "Give me a morning news briefing",
    ],
  },
  {
    id: "file-organization",
    name: "File Organization",
    description: "Tidies up your files and helps you find things when you need them.",
    icon: "",
    category: "Productivity",
    tier: "starter",
    popular: false,
    capabilities: [
      "Organizes files into logical folders",
      "Renames files with consistent naming",
      "Finds documents by describing what's in them",
      "Cleans up duplicates and clutter",
    ],
    examples: [
      "Organize my Downloads folder",
      "Find that PDF about insurance from last month",
      "Clean up duplicate photos",
    ],
  },
  {
    id: "recipe-finder",
    name: "Recipe Finder",
    description: "Suggests recipes based on what you have in the fridge or what you're craving.",
    icon: "",
    category: "Home & Life",
    tier: "starter",
    popular: true,
    capabilities: [
      "Finds recipes from ingredients you have on hand",
      "Filters by dietary preferences and allergies",
      "Scales recipes up or down",
      "Creates shopping lists for missing ingredients",
    ],
    examples: [
      "What can I make with chicken, rice, and broccoli?",
      "Find me a quick vegetarian dinner",
      "Make a shopping list for that pasta recipe",
    ],
  },
  {
    id: "smart-home",
    name: "Smart Home Control",
    description: "Manages your smart devices so you can control your home with a message.",
    icon: "",
    category: "Home & Life",
    tier: "pro",
    popular: false,
    capabilities: [
      "Controls lights, thermostats, and locks",
      "Creates routines and automations",
      "Monitors security cameras",
      "Gets alerts when something unusual happens",
    ],
    examples: [
      "Turn off all the lights downstairs",
      "Set the thermostat to 72 degrees",
      "Is the front door locked?",
    ],
  },
  {
    id: "investment-tracking",
    name: "Investment Tracking",
    description: "Keeps an eye on your investments and explains what's happening in plain English.",
    icon: "",
    category: "Productivity",
    tier: "pro",
    popular: false,
    capabilities: [
      "Tracks your portfolio performance",
      "Explains market movements simply",
      "Alerts you to significant changes",
      "Summarizes earnings reports and financial news",
    ],
    examples: [
      "How's my portfolio doing this week?",
      "Why did tech stocks drop today?",
      "Summarize Tesla's latest earnings",
    ],
  },
  {
    id: "travel-planning",
    name: "Travel Planning",
    description: "Plans your trips from flights to hotels to the fun stuff in between.",
    icon: "",
    category: "Home & Life",
    tier: "pro",
    popular: true,
    capabilities: [
      "Finds and compares flights and hotels",
      "Builds day-by-day itineraries",
      "Suggests restaurants and activities",
      "Tracks prices and alerts you to deals",
    ],
    examples: [
      "Plan a 5-day trip to Japan for two",
      "Find cheap flights to Denver next month",
      "What are the must-see spots in Lisbon?",
    ],
  },
  {
    id: "content-creation",
    name: "Content Creation",
    description: "Helps you write blog posts, newsletters, and anything else you publish.",
    icon: "",
    category: "Creative",
    tier: "pro",
    popular: true,
    capabilities: [
      "Drafts blog posts and articles from an outline or idea",
      "Writes newsletters in your voice",
      "Suggests headlines and hooks that grab attention",
      "Edits and polishes your drafts",
    ],
    examples: [
      "Write a blog post about our homeschooling routine",
      "Help me outline a newsletter about snowbird life",
      "Make this draft sound more conversational",
    ],
  },
  {
    id: "code-assistant",
    name: "Code Assistant",
    description: "Your programming sidekick — writes, explains, and fixes code for you.",
    icon: "",
    category: "Creative",
    tier: "pro",
    popular: false,
    capabilities: [
      "Writes code in any popular language",
      "Explains what existing code does",
      "Debugs errors and suggests fixes",
      "Reviews pull requests and suggests improvements",
    ],
    examples: [
      "Write a Python script to rename all my photos by date",
      "Why is this function returning undefined?",
      "Review my latest PR",
    ],
  },
  {
    id: "custom-integrations",
    name: "Custom Integrations",
    description: "Connects your favorite apps and services so they all work together.",
    icon: "",
    category: "Productivity",
    tier: "pro",
    popular: false,
    capabilities: [
      "Connects to APIs and third-party services",
      "Builds custom workflows between apps",
      "Triggers actions based on events",
      "No coding required — just describe what you want",
    ],
    examples: [
      "When I get an email from my accountant, add it to my Trello board",
      "Post my Instagram photos to Pinterest automatically",
      "Send me a Slack message when my website goes down",
    ],
  },
];

export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return SKILLS.filter((s) => s.category === category);
}
