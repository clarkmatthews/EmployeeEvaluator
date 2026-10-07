import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const levelDefaults = {
  p1Incl: true,
  p2Incl: true,
  p3Incl: true,
  p4Incl: true,
  p5Incl: true,
  p1Score: 5,
  p2Score: 10,
  p3Score: 15,
  p4Score: 20,
  p5Score: 25,
  p1Min: -100,
  p2Min: -15,
  p3Min: 0,
  p4Min: 10,
  p5Min: 25,
  p1Label: "Unsatisfactory",
  p2Label: "Needs improvement",
  p3Label: "Meets expectations",
  p4Label: "Exceeds expectations",
  p5Label: "Outstanding",
};

const firstNames = [
  "Alex", "Jordan", "Taylor", "Casey", "Riley", "Avery", "Quinn", "Drew",
  "Jamie", "Skyler", "Reese", "Parker", "Rowan", "Hayden", "Emerson", "Finley",
  "Sawyer", "Peyton", "Cameron", "Dakota", "Harper", "Logan", "Micah", "Noah",
];
const lastNames = [
  "Nguyen", "Patel", "Garcia", "Kim", "Brooks", "Singh", "Cohen", "Walsh",
  "Bennett", "Ortiz", "Murphy", "Sato", "Diaz", "Foster", "Reed", "Hughes",
  "Powell", "Barnes", "Coleman", "Price", "Long", "Ward", "Cox", "Gray",
];

const profiles = [
  { performance: "Outstanding", potential: "High", trend: "Improving", level: 5, achieved: 130, action: "Promote" },
  { performance: "Exceeds expectations", potential: "High", trend: "Improving", level: 4, achieved: 118, action: "Promote" },
  { performance: "Exceeds expectations", potential: "Medium", trend: "Stable", level: 4, achieved: 112, action: "Develop in place" },
  { performance: "Meets expectations", potential: "High", trend: "Improving", level: 3, achieved: 104, action: "Develop in place" },
  { performance: "Meets expectations", potential: "Medium", trend: "Stable", level: 3, achieved: 100, action: "No change" },
  { performance: "Meets expectations", potential: "Low", trend: "Stable", level: 3, achieved: 101, action: "No change" },
  { performance: "Needs improvement", potential: "Medium", trend: "Declining", level: 2, achieved: 88, action: "Develop in place" },
  { performance: "Needs improvement", potential: "Low", trend: "Declining", level: 2, achieved: 82, action: "Lateral move" },
  { performance: "Unsatisfactory", potential: "Low", trend: "Declining", level: 1, achieved: 55, action: "Lateral move" },
] as const;

const potentialRank = { High: 0, Medium: 1, Low: 2 };

type RosterGroup = {
  id: string;
  name: string;
  count: number;
  titles: string[];
  existing?: { id: string; firstName: string; lastName: string }[];
};

async function seedRoster(input: {
  companyId: string;
  passwordHash: string;
  reviewerId: string;
  paCycleId: string;
  topsCycleId: string;
  templateId: string;
  salesId: string;
  serviceId: string;
  revenueId: string;
  deliveryId: string;
  collaborationId: string;
  ggItemIds: string[];
  groups: RosterGroup[];
}) {
  let serial = 300;
  const summary: string[] = [];

  for (const group of input.groups) {
    const created = await prisma.user.createManyAndReturn({
      data: Array.from({ length: group.count }, (_, index) => {
        const number = serial + index;
        const firstName = firstNames[number % firstNames.length];
        const lastName = lastNames[Math.floor(number / firstNames.length) % lastNames.length];
        return {
          companyId: input.companyId,
          email: `${firstName}.${lastName}.${number}@empeval.local`.toLowerCase(),
          passwordHash: input.passwordHash,
          role: "EMPLOYEE" as const,
          firstName,
          lastName,
          employeeNumber: `E${number}`,
          jobTitle: group.titles[index % group.titles.length],
          department: group.name,
        };
      }),
    });
    serial += group.count;

    const members = [...(group.existing ?? []), ...created];
    await prisma.groupMember.createMany({
      data: created.map((user) => ({ groupId: group.id, userId: user.id })),
    });

    const completedCount = Math.round(members.length * 0.8);
    const completed = members.slice(0, completedCount);
    const keyValues = [];
    const ranks: { userId: string; performance: string; potential: string }[] = [];

    for (let index = 0; index < completed.length; index += 1) {
      const person = completed[index];
      const profile = profiles[index % profiles.length];
      const selfLevel = index % 3 === 0 ? Math.min(5, profile.level + 1) : profile.level;
      const name = `${person.firstName} ${person.lastName}`;
      keyValues.push(
        { cycleId: input.paCycleId, userId: person.id, keyItemId: input.salesId, sortOrder: 1, value: 100 },
        { cycleId: input.paCycleId, userId: person.id, keyItemId: input.serviceId, sortOrder: 2, value: 90 },
      );
      ranks.push({ userId: person.id, performance: profile.performance, potential: profile.potential });

      await prisma.evaluation.create({
        data: {
          cycleId: input.paCycleId,
          groupId: group.id,
          employeeId: person.id,
          reviewerId: input.reviewerId,
          appraisal: {
            create: {
              templateId: input.templateId,
              superComment1: `${name} delivered the results expected for ${group.name}.`,
              empComment: "I focused on the goals we set at the start of the cycle.",
              mgrDutyPct: 20,
              empSignature: name,
              supSignature: "Morgan Manager",
              keyLines: {
                create: [
                  {
                    keyItemId: input.salesId,
                    targetAmount: 100,
                    achievedAmount: profile.achieved,
                    empLevel: selfLevel,
                    supLevel: profile.level,
                    empComment: "Tracked against the annual target.",
                    supComment: "Result matches the recorded achievement.",
                  },
                  {
                    keyItemId: input.serviceId,
                    targetAmount: 100,
                    achievedAmount: profile.achieved,
                    empLevel: selfLevel,
                    supLevel: profile.level,
                    supComment: "Service scores stayed in the same range as sales.",
                  },
                ],
              },
              scorecardLines: {
                create: [{
                  scorecardItemId: input.revenueId,
                  numberAmount: 10,
                  dollarAmount: { 5: 300, 4: 150, 3: 50, 2: -8, 1: -200 }[profile.level],
                  empLevel: selfLevel,
                  supLevel: profile.level,
                  supComment: "Revenue per transaction is in the expected band.",
                }],
              },
              accountabilityLines: {
                create: [{
                  accountabilityItemId: input.deliveryId,
                  text: "Follows through on customer and team commitments.",
                  empLevel: selfLevel,
                  supLevel: profile.level,
                  supComment: "Commitments were met on the agreed dates.",
                }],
              },
              behaviorLines: {
                create: [{
                  behaviorItemId: input.collaborationId,
                  empLevel: selfLevel,
                  supLevel: profile.level,
                  supComment: "Works with neighboring teams when the work crosses groups.",
                }],
              },
              goals: {
                create: [
                  { goalNumber: 1, goal: "Raise results against the annual target.", completionDate: new Date(Date.UTC(2026, 5, 30)) },
                  { goalNumber: 2, goal: "Coach one newer teammate through their first quarter.", completionDate: new Date(Date.UTC(2026, 8, 30)) },
                ],
              },
            },
          },
        },
      });

      await prisma.evaluation.create({
        data: {
          cycleId: input.topsCycleId,
          groupId: group.id,
          employeeId: person.id,
          reviewerId: input.reviewerId,
          talentReview: {
            create: {
              performance: profile.performance,
              potential: profile.potential,
              perfTrend: profile.trend,
              stpAction: profile.action,
              stpWhen: "Within 6 months",
              stpMove: profile.action === "Promote" ? "Next role in the same branch" : "",
              stpBestFit: group.name,
              stpExplanation: `${profile.performance} performance with ${profile.potential.toLowerCase()} potential.`,
              ltpAction: profile.potential === "High" ? "Promote" : "Develop in place",
              ltpWhen: "12 to 18 months",
              ltpBestFit: group.name,
              ltpExplanation: "Keep the person in a role that uses their current strengths.",
              willingRelocate: index % 2 === 0 ? "Yes" : "No",
              geoPref: group.name.startsWith("East") ? "East" : "West",
              strength1: "Follows through on commitments",
              weakness1: "Can take on a broader scope",
              strength2: "Clear communication with the team",
              weakness2: "Delegation",
              comments: `Talent review for ${name} in ${group.name}.`,
              ggResponses: {
                create: input.ggItemIds.map((ggItemId) => ({ ggItemId, rating: profile.level })),
              },
            },
          },
        },
      });
    }

    if (keyValues.length) await prisma.keyItemValue.createMany({ data: keyValues });

    const byPerformance = [...ranks].sort((a, b) => {
      const levelA = profiles.find((profile) => profile.performance === a.performance)?.level ?? 0;
      const levelB = profiles.find((profile) => profile.performance === b.performance)?.level ?? 0;
      return levelB - levelA;
    });
    const byPotential = [...ranks].sort(
      (a, b) => potentialRank[a.potential as keyof typeof potentialRank] - potentialRank[b.potential as keyof typeof potentialRank],
    );
    await prisma.talentRank.createMany({
      data: ranks.map((rank) => ({
        cycleId: input.topsCycleId,
        groupId: group.id,
        userId: rank.userId,
        perfRank: byPerformance.findIndex((row) => row.userId === rank.userId) + 1,
        potlRank: byPotential.findIndex((row) => row.userId === rank.userId) + 1,
      })),
    });

    summary.push(`${group.name}: ${members.length} people, ${completed.length} appraisals and talent reviews`);
  }

  console.log(summary.join("\n"));
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed a production database.");
    process.exit(1);
  }
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Company" CASCADE`);
  const passwordHash = await bcrypt.hash("empEval123!", 10);
  const company = await prisma.company.create({ data: { name: "Sample Company" } });

  const [department, store, area, assistant] = await Promise.all(
    ["Department", "Store", "Area", "Assistant Manager"].map((name) =>
      prisma.groupType.create({ data: { companyId: company.id, name } }),
    ),
  );

  const [pa, tops] = await Promise.all([
    prisma.formKind.create({ data: { companyId: company.id, name: "PA" } }),
    prisma.formKind.create({ data: { companyId: company.id, name: "TOPS" } }),
  ]);
  const segment = await prisma.segmentType.create({
    data: { companyId: company.id, name: "All employees" },
  });

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "admin@empeval.local",
      passwordHash,
      role: "ADMIN",
      firstName: "Avery",
      lastName: "Admin",
      employeeNumber: "A100",
      jobTitle: "HR administrator",
      department: "People",
    },
  });
  const manager = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "manager@empeval.local",
      passwordHash,
      role: "MANAGER",
      firstName: "Morgan",
      lastName: "Manager",
      employeeNumber: "M100",
      jobTitle: "Sales manager",
      department: "West Sales",
    },
  });
  const evan = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "evan@empeval.local",
      passwordHash,
      role: "EMPLOYEE",
      firstName: "Evan",
      lastName: "Employee",
      employeeNumber: "E200",
      jobTitle: "Sales associate",
      department: "West Sales",
    },
  });
  const riley = await prisma.user.create({
    data: {
      companyId: company.id,
      email: "riley@empeval.local",
      passwordHash,
      role: "EMPLOYEE",
      firstName: "Riley",
      lastName: "Rep",
      employeeNumber: "E201",
      jobTitle: "Sales associate",
      department: "West Sales",
    },
  });

  const west = await prisma.orgGroup.create({
    data: { companyId: company.id, groupTypeId: area.id, name: "West", usersCanEditOwnAppraisal: false },
  });
  const westSales = await prisma.orgGroup.create({
    data: {
      companyId: company.id,
      groupTypeId: department.id,
      name: "West Sales",
      usersCanEditOwnAppraisal: true,
    },
  });
  const westLeads = await prisma.orgGroup.create({
    data: {
      companyId: company.id,
      groupTypeId: assistant.id,
      name: "West Leads",
      usersCanEditOwnAppraisal: false,
    },
  });
  const east = await prisma.orgGroup.create({
    data: { companyId: company.id, groupTypeId: area.id, name: "East", usersCanEditOwnAppraisal: false },
  });
  const eastOps = await prisma.orgGroup.create({
    data: { companyId: company.id, groupTypeId: store.id, name: "East Ops", usersCanEditOwnAppraisal: false },
  });

  await prisma.groupLink.createMany({
    data: [
      { parentId: west.id, childId: westSales.id },
      { parentId: westSales.id, childId: westLeads.id },
      { parentId: east.id, childId: eastOps.id },
    ],
  });
  await prisma.groupMember.createMany({
    data: [
      { groupId: westSales.id, userId: evan.id },
      { groupId: westSales.id, userId: riley.id },
    ],
  });
  await prisma.groupOwner.create({ data: { groupId: westSales.id, userId: manager.id } });

  const openDate = new Date(Date.UTC(2026, 0, 1));
  const closeDate = new Date(Date.UTC(2026, 11, 31));
  const cycleGroups = [west, westSales, westLeads, east, eastOps].map((group) => ({ groupId: group.id }));
  const paCycle = await prisma.cycle.create({
    data: {
      companyId: company.id,
      year: 2026,
      formKindId: pa.id,
      segmentTypeId: segment.id,
      openDate,
      closeDate,
      history: { create: { action: "add", comments: "Seeded cycle", actorName: admin.email, userId: admin.id } },
      groups: { create: cycleGroups },
    },
  });
  const topsCycle = await prisma.cycle.create({
    data: {
      companyId: company.id,
      year: 2026,
      formKindId: tops.id,
      segmentTypeId: segment.id,
      openDate,
      closeDate,
      history: { create: { action: "add", comments: "Seeded cycle", actorName: admin.email, userId: admin.id } },
      groups: { create: cycleGroups },
    },
  });

  const sales = await prisma.keyItem.create({
    data: { companyId: company.id, name: "Sales vs target", sortOrder: 1, ...levelDefaults },
  });
  const service = await prisma.keyItem.create({
    data: { companyId: company.id, name: "Customer satisfaction", sortOrder: 2, ...levelDefaults },
  });
  const revenue = await prisma.scorecardItem.create({
    data: { companyId: company.id, name: "Revenue per transaction", sortOrder: 1, ...levelDefaults },
  });
  const delivery = await prisma.accountabilityItem.create({
    data: { companyId: company.id, name: "Delivers on commitments", sortOrder: 1, ...levelDefaults },
  });
  const collaboration = await prisma.behaviorItem.create({
    data: { companyId: company.id, name: "Collaborates across the team", sortOrder: 1, ...levelDefaults },
  });

  const template = await prisma.appraisalTemplate.create({
    data: {
      companyId: company.id,
      year: 2026,
      formKindId: pa.id,
      whoType: "Employee",
      inclOthrJobs: true,
      inclScorecardSect: true,
      inclMgrDutysSect: true,
      inclSuper2CmtSect: true,
      formRatingsDesc:
        "Points from each selected rating are added. Exceeds expectations starts at the EE minimum. Meets expectations starts at the ME minimum.",
      formInstruct: "Employees complete their column. Managers complete the supervisor column.",
      keysSectInstruct: "Enter target and achieved amounts. The rating is suggested from the percent above or below target.",
      scorecardSectInstruct: "Enter the count and the dollar amount. The rating uses dollars divided by count.",
      eeMin: 80,
      meMin: 51,
      keyItems: {
        create: [
          { keyItemId: sales.id, sortOrder: 1 },
          { keyItemId: service.id, sortOrder: 2 },
        ],
      },
      scorecardItems: { create: [{ scorecardItemId: revenue.id, sortOrder: 1 }] },
      accountabilityItems: { create: [{ accountabilityItemId: delivery.id, sortOrder: 1 }] },
      behaviorItems: { create: [{ behaviorItemId: collaboration.id, sortOrder: 1 }] },
    },
  });

  const gg = [
    ["Builds a strong team", "Look for how the person develops others."],
    ["Confronts brutal facts", "Look for honest assessment of results."],
    ["Keeps the hedgehog concept", "Look for focus on what the team does best."],
    ["Uses a culture of discipline", "Look for consistent follow-through."],
  ];
  const ggItems = await Promise.all(
    gg.map(([itemText, helpText], index) =>
      prisma.ggItem.create({
        data: { companyId: company.id, itemSeq: index + 1, itemText, helpText },
      }),
    ),
  );

  await seedRoster({
    companyId: company.id,
    passwordHash,
    reviewerId: manager.id,
    paCycleId: paCycle.id,
    topsCycleId: topsCycle.id,
    templateId: template.id,
    salesId: sales.id,
    serviceId: service.id,
    revenueId: revenue.id,
    deliveryId: delivery.id,
    collaborationId: collaboration.id,
    ggItemIds: ggItems.map((item) => item.id),
    groups: [
      { id: west.id, name: "West", count: 12, titles: ["Area coordinator", "Regional analyst"] },
      {
        id: westSales.id,
        name: "West Sales",
        count: 15,
        titles: ["Sales associate", "Account executive"],
        existing: [evan, riley],
      },
      { id: westLeads.id, name: "West Leads", count: 11, titles: ["Team lead", "Assistant manager"] },
      { id: east.id, name: "East", count: 18, titles: ["Area coordinator", "Operations analyst"] },
      { id: eastOps.id, name: "East Ops", count: 14, titles: ["Store associate", "Shift lead"] },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
