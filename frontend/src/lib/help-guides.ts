export interface GuideItem {
  title: string;
  description: string;
  link: string;
  linkLabel: string;
}

export interface GuideSection {
  heading: string;
  items: GuideItem[];
}

export type AuthTierKey = 'PARENT' | 'LEADER' | 'DEN_CHIEF' | 'ADMIN';

export const helpGuides: Record<AuthTierKey, GuideSection[]> = {
  PARENT: [
    {
      heading: 'Your Profile',
      items: [
        {
          title: 'Update Contact Info',
          description: 'Keep your phone and email current so the pack can reach you, and set your notification preferences.',
          link: '/profile',
          linkLabel: 'Go to Profile',
        },
      ],
    },
    {
      heading: 'Your Cub Scouts',
      items: [
        {
          title: 'Scout Profiles',
          description: "View your scouts' current rank, den assignment, and adventure progress at a glance.",
          link: '/my-cub-scouts',
          linkLabel: 'View Scouts',
        },
        {
          title: 'Request a Scout Link',
          description: "If your scout isn't linked to your account yet, submit a parent-child link request for leader approval.",
          link: '/my-cub-scouts',
          linkLabel: 'Manage Links',
        },
      ],
    },
    {
      heading: 'Volunteering',
      items: [
        {
          title: 'Browse Events',
          description: 'Find upcoming pack events and see which volunteer roles are open to fill.',
          link: '/events',
          linkLabel: 'View Events',
        },
        {
          title: 'My Tasks',
          description: "See all tasks you've signed up for, track your completion status, and earn volunteer points.",
          link: '/tasks',
          linkLabel: 'View Tasks',
        },
      ],
    },
    {
      heading: 'Points & Recognition',
      items: [
        {
          title: 'My Points',
          description: 'See your total volunteer points, current badge tier, and full contribution history.',
          link: '/points',
          linkLabel: 'View Points',
        },
        {
          title: 'Leaderboard',
          description: 'See how your volunteer contributions compare with others across the pack.',
          link: '/leaderboard',
          linkLabel: 'View Leaderboard',
        },
      ],
    },
    {
      heading: 'Stay Informed',
      items: [
        {
          title: 'Notifications',
          description: 'View pack announcements, event reminders, and updates on your task assignments.',
          link: '/notifications',
          linkLabel: 'View Notifications',
        },
      ],
    },
  ],

  LEADER: [
    {
      heading: 'Your Profile',
      items: [
        {
          title: 'Update Your Profile',
          description: 'Keep your contact info, role details, and notification preferences current.',
          link: '/profile',
          linkLabel: 'Go to Profile',
        },
      ],
    },
    {
      heading: 'Your Den',
      items: [
        {
          title: 'Den Roster',
          description: "View all scouts in your den, their current rank, and a summary of adventure completion.",
          link: '/my-dens',
          linkLabel: 'View Den',
        },
        {
          title: 'Track Advancement',
          description: 'Mark requirement completions, view adventure progress per scout, and see who is eligible for awards.',
          link: '/my-dens',
          linkLabel: 'View Advancement',
        },
        {
          title: 'Award Workflow',
          description: 'Manage awards through the full lifecycle: eligible → approved → purchased → distributed → reconciled.',
          link: '/my-dens',
          linkLabel: 'Manage Awards',
        },
      ],
    },
    {
      heading: 'Pack Volunteers',
      items: [
        {
          title: 'Volunteer Directory',
          description: 'Browse all pack volunteers, view their roles and contact info, and manage den assignments.',
          link: '/volunteers',
          linkLabel: 'View Volunteers',
        },
      ],
    },
    {
      heading: 'Events & Tasks',
      items: [
        {
          title: 'Pack Events',
          description: 'Browse all upcoming events, view open volunteer slots, and manage your own sign-ups.',
          link: '/events',
          linkLabel: 'View Events',
        },
        {
          title: 'My Tasks',
          description: 'Track tasks you are signed up for across all events and update completion status.',
          link: '/tasks',
          linkLabel: 'View Tasks',
        },
      ],
    },
    {
      heading: 'Reports',
      items: [
        {
          title: 'Advancement & Participation Reports',
          description: 'Generate per-den or pack-wide reports on advancement progress and volunteer participation.',
          link: '/reports',
          linkLabel: 'View Reports',
        },
      ],
    },
  ],

  DEN_CHIEF: [
    {
      heading: 'Your Profile',
      items: [
        {
          title: 'Update Your Profile',
          description: 'Keep your contact info and notification preferences up to date.',
          link: '/profile',
          linkLabel: 'Go to Profile',
        },
      ],
    },
    {
      heading: 'Your Dens',
      items: [
        {
          title: 'Den Roster',
          description: 'View the dens you support and the scouts in each, including their rank and den assignment.',
          link: '/my-dens',
          linkLabel: 'View Dens',
        },
        {
          title: 'Track Advancement',
          description: 'See scout progress on requirements and adventures in your assigned den.',
          link: '/my-dens',
          linkLabel: 'View Advancement',
        },
      ],
    },
    {
      heading: 'Events & Tasks',
      items: [
        {
          title: 'Pack Events',
          description: 'Browse upcoming pack events and see where volunteer help is needed.',
          link: '/events',
          linkLabel: 'View Events',
        },
        {
          title: 'My Tasks',
          description: 'View tasks you have been assigned and update your completion status.',
          link: '/tasks',
          linkLabel: 'View Tasks',
        },
      ],
    },
    {
      heading: 'Points & Recognition',
      items: [
        {
          title: 'My Points',
          description: 'See your volunteer points and current badge tier.',
          link: '/points',
          linkLabel: 'View Points',
        },
        {
          title: 'Leaderboard',
          description: 'See how your contributions compare with other volunteers across the pack.',
          link: '/leaderboard',
          linkLabel: 'View Leaderboard',
        },
      ],
    },
  ],

  ADMIN: [
    {
      heading: 'Your Profile',
      items: [
        {
          title: 'Update Your Profile',
          description: 'Keep your contact info and notification preferences current.',
          link: '/profile',
          linkLabel: 'Go to Profile',
        },
      ],
    },
    {
      heading: 'Pack Management',
      items: [
        {
          title: 'Pack Configuration',
          description: 'Set the pack number, pack name, season dates, and other global pack settings.',
          link: '/admin/config',
          linkLabel: 'Configure Pack',
        },
        {
          title: 'Volunteer Management',
          description: 'View all volunteers, manage their auth tiers, assign roles, and configure den scoping.',
          link: '/volunteers',
          linkLabel: 'Manage Volunteers',
        },
        {
          title: 'Den Management',
          description: 'View and manage all dens, their rosters, and den leader assignments across the pack.',
          link: '/my-dens',
          linkLabel: 'Manage Dens',
        },
      ],
    },
    {
      heading: 'Scout Advancement',
      items: [
        {
          title: 'All Scouts',
          description: 'Browse every scout in the pack, view advancement status, and manage den memberships.',
          link: '/my-dens',
          linkLabel: 'View Scouts',
        },
        {
          title: 'Award Workflow',
          description: 'Oversee award approval, purchasing, distribution, and reconciliation across all dens.',
          link: '/my-dens',
          linkLabel: 'Manage Awards',
        },
      ],
    },
    {
      heading: 'Data Import',
      items: [
        {
          title: 'Bulk Import',
          description: 'Import scouts, volunteers, and advancement data from CSV files. Check import history and error logs.',
          link: '/admin/config',
          linkLabel: 'Go to Imports',
        },
      ],
    },
    {
      heading: 'Events & Volunteering',
      items: [
        {
          title: 'Pack Events',
          description: 'Create and manage events, define volunteer roles, and track sign-up status across the pack.',
          link: '/events',
          linkLabel: 'Manage Events',
        },
        {
          title: 'All Tasks',
          description: 'View volunteer task assignments across every event and monitor completion.',
          link: '/tasks',
          linkLabel: 'View Tasks',
        },
      ],
    },
    {
      heading: 'Reports',
      items: [
        {
          title: 'Pack Reports',
          description: 'Generate advancement, participation, and award reports across all dens and the full pack.',
          link: '/reports',
          linkLabel: 'View Reports',
        },
      ],
    },
    {
      heading: 'Points & Recognition',
      items: [
        {
          title: 'Leaderboard & Points',
          description: 'Monitor pack-wide volunteer points, badge tier assignments, and leaderboard standings.',
          link: '/leaderboard',
          linkLabel: 'View Leaderboard',
        },
      ],
    },
  ],
};
