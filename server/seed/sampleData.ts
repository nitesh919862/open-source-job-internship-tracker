import bcrypt from 'bcryptjs';
import { repository } from '../services/repository.ts';

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function ensureSampleDataSeeded(): Promise<void> {
  if (
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && process.env.ENABLE_DEMO_SEED !== 'true')
  ) {
    console.log('[Seed] Automatic demo seeding is limited to local development.');
    return;
  }

  const existingUsers = await repository.countUsers();
  const existingOpps = await repository.queryOpportunities({ status: 'all', limit: 1 });

  if (existingUsers > 0 && existingOpps.total > 0) {
    return;
  }

  let adminId = '';
  let seekerId = '';

  if (existingUsers === 0) {
    const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim() || 'admin@opentrack.dev';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD?.trim() || 'AdminPassword123!';
    const seekerEmail = process.env.USER_SEED_EMAIL?.trim() || 'seeker@opentrack.dev';
    const seekerPassword = process.env.USER_SEED_PASSWORD?.trim() || 'SeekerPassword123!';

    const [adminHash, seekerHash] = await Promise.all([
      bcrypt.hash(adminPassword, 10),
      bcrypt.hash(seekerPassword, 10),
    ]);

    const adminUser = await repository.createUser({
      name: 'Priya Nair',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'admin',
      skills: ['TypeScript', 'Node.js', 'System Design', 'Community Moderation'],
      headline: 'Platform Maintainer & Engineering Lead',
      location: 'Bengaluru, India',
      bio: 'Curating open-source career listings and verifying community submissions.',
    });

    const seekerUser = await repository.createUser({
      name: 'Aarav Mehta',
      email: seekerEmail,
      passwordHash: seekerHash,
      role: 'user',
      skills: ['React', 'TypeScript', 'Express', 'MongoDB', 'Tailwind CSS'],
      headline: 'Final-Year CS Student & Full-Stack Developer',
      location: 'Pune, India',
      bio: 'Actively looking for full-stack software engineering internships and entry-level roles.',
    });

    adminId = adminUser._id;
    seekerId = seekerUser._id;
  } else {
    const users = await repository.listUsers();
    adminId = users.find((u) => u.role === 'admin')?._id || users[0]._id;
    seekerId = users.find((u) => u.role === 'user')?._id || users[0]._id;
  }

  if (existingOpps.total === 0) {
    const sampleOpportunities = [
      {
        title: 'Software Engineering Intern — Core Platform',
        company: 'Northstar Cloud Labs (Sample)',
        description:
          'Sample Opportunity Record: Join our distributed systems team to build observability dashboards, TypeScript SDKs, and automated regression pipelines. You will pair daily with senior backend engineers and ship production pull requests.',
        skills: ['TypeScript', 'React', 'Node.js', 'Docker'],
        type: 'Internship' as const,
        workMode: 'Remote' as const,
        location: 'Remote (Global)',
        stipend: '$1,800 / month',
        isPaid: true,
        applicationUrl: 'https://example.org/sample/northstar-swe-intern',
        deadline: daysFromNow(22),
        status: 'approved' as const,
        isSample: true,
        submittedBy: adminId,
      },
      {
        title: 'Full-Stack Engineer (Early Career)',
        company: 'Verdant Telemetry Systems (Sample)',
        description:
          'Sample Opportunity Record: Help design and scale customer-facing analytics tools using React, Express, and MongoDB. Ideal for 2025/2026 graduates or engineers with 0–2 years of experience who enjoy owning features end-to-end.',
        skills: ['React', 'MongoDB', 'Express', 'REST APIs'],
        type: 'Full-time job' as const,
        workMode: 'Hybrid' as const,
        location: 'Bengaluru, India',
        stipend: '₹12–16 LPA',
        isPaid: true,
        applicationUrl: 'https://example.org/sample/verdant-fullstack',
        deadline: daysFromNow(30),
        status: 'approved' as const,
        isSample: true,
        submittedBy: adminId,
      },
      {
        title: 'Open-Source Civic Data Intern',
        company: 'CivicData Commons (Sample)',
        description:
          'Sample Opportunity Record: Contribute to public transit and municipal transparency datasets. Build ETL scrapers in Python, clean GeoJSON records, and collaborate with civic hackers in weekly open community sprints.',
        skills: ['Python', 'PostgreSQL', 'Git', 'Data Cleaning'],
        type: 'Internship' as const,
        workMode: 'Remote' as const,
        location: 'Remote (India / EU)',
        stipend: 'Unpaid (OSS Fellowship)',
        isPaid: false,
        applicationUrl: 'https://example.org/sample/civicdata-intern',
        deadline: daysFromNow(15),
        status: 'approved' as const,
        isSample: true,
        submittedBy: seekerId,
      },
      {
        title: 'Frontend Systems Engineer',
        company: 'Trellis Design Systems (Sample)',
        description:
          'Sample Opportunity Record: Architect accessible React component primitives, keyboard navigation patterns, and design-token documentation used across 40+ internal applications.',
        skills: ['React', 'TypeScript', 'Accessibility', 'Tailwind CSS'],
        type: 'Full-time job' as const,
        workMode: 'Remote' as const,
        location: 'Remote (US / Canada)',
        stipend: '$115,000 – $135,000 / yr',
        isPaid: true,
        applicationUrl: 'https://example.org/sample/trellis-frontend',
        deadline: daysFromNow(28),
        status: 'approved' as const,
        isSample: true,
        submittedBy: adminId,
      },
      {
        title: 'Backend Node.js Developer — Payments Ledger',
        company: 'Harborline Fintech Lab (Sample)',
        description:
          'Sample Opportunity Record: Build idempotent webhook processors, audit logs, and reconciliation APIs in Node.js and MongoDB Atlas. Strong emphasis on automated integration testing and security.',
        skills: ['Node.js', 'MongoDB', 'JWT', 'Redis'],
        type: 'Full-time job' as const,
        workMode: 'On-site' as const,
        location: 'Mumbai, India',
        stipend: '₹15–20 LPA',
        isPaid: true,
        applicationUrl: 'https://example.org/sample/harborline-backend',
        deadline: daysFromNow(18),
        status: 'approved' as const,
        isSample: true,
        submittedBy: adminId,
      },
      {
        title: 'Product Analytics & Visualization Intern',
        company: 'Arbor Analytics Collective (Sample)',
        description:
          'Sample Opportunity Record: Create interactive Recharts visualizations, cohort funnel queries, and weekly insight briefs for B2B SaaS customers. Mentorship from staff data analysts included.',
        skills: ['SQL', 'React', 'Recharts', 'Statistics'],
        type: 'Internship' as const,
        workMode: 'Hybrid' as const,
        location: 'Austin, TX',
        stipend: '$28 / hour',
        isPaid: true,
        applicationUrl: 'https://example.org/sample/arbor-analytics-intern',
        deadline: daysFromNow(12),
        status: 'approved' as const,
        isSample: true,
        submittedBy: adminId,
      },
      {
        title: 'Technical Documentation Specialist (Part-time)',
        company: 'Solstice DevTools (Sample)',
        description:
          'Sample Opportunity Record: Author REST API guides, OpenAPI examples, and quickstart tutorials for developer CLI tooling. Flexible 18 hours/week schedule suited for students or independent writers.',
        skills: ['Markdown', 'REST APIs', 'OpenAPI', 'TypeScript'],
        type: 'Part-time job' as const,
        workMode: 'Remote' as const,
        location: 'Remote (Worldwide)',
        stipend: '$32 / hour',
        isPaid: true,
        applicationUrl: 'https://example.org/sample/solstice-docs-parttime',
        deadline: daysFromNow(25),
        status: 'approved' as const,
        isSample: true,
        submittedBy: adminId,
      },
      {
        title: 'UI Engineering Contractor — Design Audit',
        company: 'Foundry Learning Lab (Sample)',
        description:
          'Sample Opportunity Record: 8-week freelance engagement to modernize student portal layouts, improve Lighthouse accessibility scores above 95, and optimize mobile responsiveness.',
        skills: ['Tailwind CSS', 'React', 'WCAG AA', 'Figma'],
        type: 'Freelance' as const,
        workMode: 'Remote' as const,
        location: 'Remote',
        stipend: '$4,200 fixed milestone',
        isPaid: true,
        applicationUrl: 'https://example.org/sample/foundry-ui-freelance',
        deadline: daysFromNow(10),
        status: 'approved' as const,
        isSample: true,
        submittedBy: seekerId,
      },
      {
        title: 'Embedded Firmware Engineering Intern',
        company: 'Kestrel Embedded Works (Sample)',
        description:
          'Sample Opportunity Record: Develop C/C++ telemetry drivers and hardware-in-the-loop test harnesses for autonomous environmental sensors.',
        skills: ['C', 'C++', 'RTOS', 'Git'],
        type: 'Internship' as const,
        workMode: 'On-site' as const,
        location: 'Hyderabad, India',
        stipend: '₹35,000 / month',
        isPaid: true,
        applicationUrl: 'https://example.org/sample/kestrel-firmware-intern',
        deadline: daysFromNow(20),
        status: 'approved' as const,
        isSample: true,
        submittedBy: adminId,
      },
      {
        title: 'Open-Source DevOps Maintainer Intern',
        company: 'Cairn Infrastructure Group (Sample)',
        description:
          'Sample Opportunity Record: Help maintain GitHub Actions CI workflows, container image hardening, and reproducible local dev environments for our open-source release tools.',
        skills: ['GitHub Actions', 'Linux', 'Docker', 'Bash'],
        type: 'Internship' as const,
        workMode: 'Remote' as const,
        location: 'Remote',
        stipend: 'Unpaid (Academic Credit)',
        isPaid: false,
        applicationUrl: 'https://example.org/sample/cairn-devops-intern',
        deadline: daysFromNow(14),
        status: 'approved' as const,
        isSample: true,
        submittedBy: adminId,
      },
      {
        title: 'Junior QA Automation Engineer',
        company: 'Meridian BioCompute (Sample)',
        description:
          'Sample Opportunity Record: Pending community submission awaiting admin moderation. Write end-to-end Playwright test suites for scientific workflow portals.',
        skills: ['Playwright', 'TypeScript', 'CI/CD'],
        type: 'Full-time job' as const,
        workMode: 'Hybrid' as const,
        location: 'Boston, MA',
        stipend: '$82,000 / yr',
        isPaid: true,
        applicationUrl: 'https://example.org/sample/meridian-qa-pending',
        deadline: daysFromNow(26),
        status: 'pending' as const,
        isSample: true,
        submittedBy: seekerId,
      },
      {
        title: 'Robotics Simulation Intern',
        company: 'Beacon Open Robotics (Sample)',
        description:
          'Sample Opportunity Record: Pending community submission awaiting admin moderation. Build ROS2 simulation worlds and path-planning benchmarks.',
        skills: ['Python', 'ROS2', 'Linux', 'C++'],
        type: 'Internship' as const,
        workMode: 'On-site' as const,
        location: 'Pune, India',
        stipend: '₹30,000 / month',
        isPaid: true,
        applicationUrl: 'https://example.org/sample/beacon-robotics-pending',
        deadline: daysFromNow(19),
        status: 'pending' as const,
        isSample: true,
        submittedBy: seekerId,
      },
    ];

    const createdOpps = [];
    for (const opp of sampleOpportunities) {
      createdOpps.push(await repository.createOpportunity(opp));
    }

    // Seed sample applications & bookmarks for the demo seeker account
    if (seekerId && createdOpps.length >= 6) {
      const [existingApps, existingBms] = await Promise.all([
        repository.listApplicationsByUser(seekerId),
        repository.listBookmarksByUser(seekerId),
      ]);

      if (existingApps.length === 0) {
        await repository.createApplication({
          userId: seekerId,
          opportunityId: createdOpps[0]._id,
          customTitle: createdOpps[0].title,
          customCompany: createdOpps[0].company,
          customUrl: createdOpps[0].applicationUrl,
          status: 'Interview',
          appliedAt: daysFromNow(-6),
          notes: 'Completed initial screening call; technical round scheduled next Tuesday.',
        });
        await repository.createApplication({
          userId: seekerId,
          opportunityId: createdOpps[1]._id,
          customTitle: createdOpps[1].title,
          customCompany: createdOpps[1].company,
          customUrl: createdOpps[1].applicationUrl,
          status: 'Shortlisted',
          appliedAt: daysFromNow(-11),
          notes: 'Submitted take-home MERN assignment. Recruiter confirmed shortlist.',
        });
        await repository.createApplication({
          userId: seekerId,
          opportunityId: createdOpps[3]._id,
          customTitle: createdOpps[3].title,
          customCompany: createdOpps[3].company,
          customUrl: createdOpps[3].applicationUrl,
          status: 'Applied',
          appliedAt: daysFromNow(-2),
          notes: 'Referred by open-source contributor; tailored portfolio link included.',
        });
        await repository.createApplication({
          userId: seekerId,
          opportunityId: createdOpps[5]._id,
          customTitle: createdOpps[5].title,
          customCompany: createdOpps[5].company,
          customUrl: createdOpps[5].applicationUrl,
          status: 'Selected',
          appliedAt: daysFromNow(-18),
          notes: 'Received offer letter — comparing timeline with summer semester dates.',
        });
      }

      if (existingBms.length === 0) {
        await repository.createBookmark(seekerId, createdOpps[2]._id);
        await repository.createBookmark(seekerId, createdOpps[4]._id);
        await repository.createBookmark(seekerId, createdOpps[6]._id);
      }

      if (existingApps.length === 0 && existingBms.length === 0) {
        await repository.createNotification({
          userId: seekerId,
          type: 'system',
          message: 'Sample seeker profile loaded with 4 tracked applications and 3 saved roles.',
          link: '/dashboard',
        });
      }
    }

    console.log(`[Seed] Seeded ${createdOpps.length} sample opportunities and demo evaluation accounts.`);
  }
}
