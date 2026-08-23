import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Daniel', 'Emily', 'Matthew', 'Elizabeth', 'Sebastian', 'Sofia', 'Jack', 'Avery', 'Aiden', 'Ella', 'Owen', 'Scarlett', 'Samuel', 'Grace', 'Ryan', 'Chloe', 'Nathan', 'Victoria', 'Leo', 'Riley', 'Adam', 'Aria', 'Dylan', 'Lily', 'Oscar', 'Layla', 'Max', 'Zoe', 'Hugo']

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function generatePhoneQatar(): string {
  return `+974 ${randomInt(3000, 9999)} ${randomInt(1000, 9999)}`
}

function generatePhoneUae(): string {
  return `+971 ${randomInt(50, 59)} ${randomInt(1000000, 9999999)}`
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

async function main() {
  // Clean all tables (order matters for FK constraints — children first)
  await prisma.auditLog.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.inventoryItem.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.service.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.stylist.deleteMany()
  await prisma.user.deleteMany()
  await prisma.location.deleteMany()
  await prisma.tenant.deleteMany()

  // Hash the default password (used for all seeded users)
  const defaultPassword = await bcrypt.hash('password123', 10)

  // ============================================================
  // TENANT 1: GlamChain Qatar (the existing demo data)
  // ============================================================
  const glamchainQatar = await prisma.tenant.create({
    data: {
      name: 'GlamChain Qatar',
      slug: 'glamchain-qatar',
      contactEmail: 'admin@glamchain.qa',
      contactPhone: '+974 4411 0000',
      primaryColor: '#0F766E',
      accentColor: '#1E3A8A',
      monogram: 'GC',
      timezone: 'Asia/Qatar',
      currency: 'QAR',
      locale: 'en',
      plan: 'pro',
      showBranding: false,  // paid tier — no "Powered by" footer
      isActive: true,
    },
  })

  // Create Locations for Tenant 1
  const westBay = await prisma.location.create({
    data: { tenantId: glamchainQatar.id, name: 'West Bay Salon', address: '123 Al Corniche Street', city: 'Doha', phone: '+974 4411 0101', email: 'westbay@glamchain.qa', openTime: '08:00', closeTime: '22:00' }
  })
  const theMall = await prisma.location.create({
    data: { tenantId: glamchainQatar.id, name: 'Mall of Qatar Salon', address: '456 Al Rayyan Road', city: 'Al Rayyan', phone: '+974 4411 0202', email: 'mall@glamchain.qa', openTime: '09:00', closeTime: '22:00' }
  })
  const pearl = await prisma.location.create({
    data: { tenantId: glamchainQatar.id, name: 'The Pearl Salon', address: '789 Porto Arabia', city: 'Doha', phone: '+974 4411 0303', email: 'pearl@glamchain.qa', openTime: '09:00', closeTime: '21:00' }
  })
  const tenant1Locations = [westBay, theMall, pearl]

  // Platform-level super_admin (no tenantId — can access all tenants)
  await prisma.user.create({
    data: { email: 'admin@glamchain.com', name: 'Sarah Mitchell', password: defaultPassword, role: 'super_admin', phone: '+974 4411 0001', isActive: true }
  })
  // Tenant-level users for Tenant 1
  await prisma.user.create({
    data: { email: 'owner.westbay@glamchain.qa', name: 'Michael Chen', password: defaultPassword, role: 'owner', phone: '+974 4411 0002', locationId: westBay.id, tenantId: glamchainQatar.id, isActive: true }
  })
  await prisma.user.create({
    data: { email: 'owner.mall@glamchain.qa', name: 'Jessica Rivera', password: defaultPassword, role: 'owner', phone: '+974 4411 0003', locationId: theMall.id, tenantId: glamchainQatar.id, isActive: true }
  })
  await prisma.user.create({
    data: { email: 'owner.pearl@glamchain.qa', name: 'David Park', password: defaultPassword, role: 'owner', phone: '+974 4411 0004', locationId: pearl.id, tenantId: glamchainQatar.id, isActive: true }
  })
  for (const loc of tenant1Locations) {
    await prisma.user.create({
      data: { email: `reception.${loc.name.split(' ')[0].toLowerCase()}@glamchain.qa`, name: `${randomItem(firstNames)} ${randomItem(lastNames)}`, password: defaultPassword, role: 'receptionist', phone: generatePhoneQatar(), locationId: loc.id, tenantId: glamchainQatar.id, isActive: true }
    })
  }

  // Services for Tenant 1 (now tenant-scoped, not global)
  const tenant1ServiceData = [
    { name: 'Haircut - Women', category: 'Hair', duration: 60, price: 250.00, description: 'Precision cut tailored to your style' },
    { name: 'Haircut - Men', category: 'Hair', duration: 30, price: 120.00, description: 'Classic or modern mens cuts' },
    { name: 'Hair Coloring', category: 'Hair', duration: 120, price: 550.00, description: 'Full color or highlights' },
    { name: 'Blowout & Styling', category: 'Hair', duration: 45, price: 200.00, description: 'Professional blowout and styling' },
    { name: 'Keratin Treatment', category: 'Hair', duration: 150, price: 900.00, description: 'Smoothing keratin treatment' },
    { name: 'Balayage', category: 'Hair', duration: 180, price: 750.00, description: 'Hand-painted highlights' },
    { name: 'Manicure', category: 'Nails', duration: 45, price: 150.00, description: 'Classic manicure with polish' },
    { name: 'Gel Manicure', category: 'Nails', duration: 60, price: 200.00, description: 'Long-lasting gel manicure' },
    { name: 'Pedicure', category: 'Nails', duration: 60, price: 180.00, description: 'Relaxing pedicure with massage' },
    { name: 'Gel Pedicure', category: 'Nails', duration: 75, price: 240.00, description: 'Gel pedicure with extended massage' },
    { name: 'Facial - Basic', category: 'Skin', duration: 60, price: 300.00, description: 'Deep cleansing facial' },
    { name: 'Facial - Premium', category: 'Skin', duration: 90, price: 500.00, description: 'Anti-aging facial with serums' },
    { name: 'Chemical Peel', category: 'Skin', duration: 45, price: 450.00, description: 'Skin resurfacing peel' },
    { name: 'Eyebrow Threading', category: 'Beauty', duration: 15, price: 75.00, description: 'Precise eyebrow shaping' },
    { name: 'Eyelash Extensions', category: 'Beauty', duration: 90, price: 550.00, description: 'Full set lash extensions' },
    { name: 'Makeup Application', category: 'Beauty', duration: 60, price: 350.00, description: 'Professional makeup for events' },
    { name: 'Waxing - Full Leg', category: 'Beauty', duration: 45, price: 220.00, description: 'Full leg waxing' },
    { name: 'Waxing - Bikini', category: 'Beauty', duration: 30, price: 180.00, description: 'Bikini line waxing' },
    { name: 'Scalp Treatment', category: 'Hair', duration: 45, price: 260.00, description: 'Deep conditioning scalp therapy' },
    { name: 'Updo & Formal Style', category: 'Hair', duration: 75, price: 350.00, description: 'Formal event styling' },
  ]
  const tenant1Services: Awaited<ReturnType<typeof prisma.service.create>>[] = []
  for (const s of tenant1ServiceData) {
    tenant1Services.push(await prisma.service.create({ data: { tenantId: glamchainQatar.id, ...s } }))
  }

  // Stylists for Tenant 1
  const specializations = ['Hair Specialist', 'Color Expert', 'Nail Artist', 'Skin Care Specialist', 'Beauty Therapist', 'Senior Stylist', 'Master Colorist']
  const stylistNames = [
    'Aria Thompson', 'Luna Martinez', 'Zoe Chen', 'Maya Patel', 'Ivy Rodriguez',
    'Chloe Kim', 'Stella Nguyen', 'Ava Williams', 'Nora Garcia', 'Lily Brown',
    'Ruby Taylor', 'Jade Wilson', 'Sage Moore', 'Quinn Jackson', 'Harper Lee',
    'Finn Adams', 'Brooks Cooper', 'Riley Morgan', 'Drew Bailey', 'Skyler Reed'
  ]
  const tenant1Stylists: Awaited<ReturnType<typeof prisma.stylist.create>>[] = []
  for (let i = 0; i < stylistNames.length; i++) {
    const loc = tenant1Locations[i % 3]
    const spec = specializations[i % specializations.length]
    tenant1Stylists.push(await prisma.stylist.create({
      data: {
        tenantId: glamchainQatar.id,
        name: stylistNames[i],
        email: `${stylistNames[i].toLowerCase().replace(' ', '.')}@glamchain.qa`,
        phone: generatePhoneQatar(),
        locationId: loc.id,
        specialization: spec,
        rating: randomFloat(3.5, 5.0),
        totalReviews: randomInt(15, 120),
        commissionRate: randomFloat(0.25, 0.40),
        isActive: true,
      }
    }))
  }

  // Customers for Tenant 1
  const tenant1Customers: Awaited<ReturnType<typeof prisma.customer.create>>[] = []
  for (let i = 0; i < 200; i++) {
    const firstName = randomItem(firstNames)
    const lastName = randomItem(lastNames)
    tenant1Customers.push(await prisma.customer.create({
      data: {
        tenantId: glamchainQatar.id,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        phone: generatePhoneQatar(),
        locationId: randomItem(tenant1Locations).id,
        loyaltyPoints: randomInt(0, 500),
        totalSpent: randomFloat(50, 5000),
        totalVisits: randomInt(1, 40),
        lastVisit: randomDate(new Date('2025-01-01'), new Date('2026-05-27')),
        notes: Math.random() > 0.7 ? 'Prefers morning appointments' : null,
      }
    }))
  }

  // Appointments for Tenant 1
  const statuses = ['confirmed', 'pending', 'completed', 'cancelled', 'no_show']
  const paymentMethods = ['cash', 'card', 'digital_wallet']
  const threeMonthsAgo = new Date('2026-02-27')
  const now = new Date('2026-05-27')

  for (let i = 0; i < 600; i++) {
    const loc = randomItem(tenant1Locations)
    const locationStylists = tenant1Stylists.filter(s => s.locationId === loc.id)
    const stylist = randomItem(locationStylists)
    const service = randomItem(tenant1Services)
    const customer = randomItem(tenant1Customers)
    const date = randomDate(threeMonthsAgo, now)

    const openHour = parseInt(loc.openTime.split(':')[0])
    const closeHour = parseInt(loc.closeTime.split(':')[0])
    date.setHours(randomInt(openHour, closeHour - 1), randomItem([0, 15, 30, 45]), 0, 0)

    let status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
    if (date > now) {
      status = Math.random() > 0.3 ? 'confirmed' : 'pending'
    } else {
      const rand = Math.random()
      if (rand < 0.55) status = 'completed'
      else if (rand < 0.7) status = 'confirmed'
      else if (rand < 0.82) status = 'cancelled'
      else if (rand < 0.92) status = 'no_show'
      else status = 'pending'
    }
    const paymentMethod = status === 'completed' ? randomItem(paymentMethods) : null

    await prisma.appointment.create({
      data: {
        tenantId: glamchainQatar.id,
        locationId: loc.id,
        customerId: customer.id,
        stylistId: stylist.id,
        serviceId: service.id,
        date,
        status,
        paymentMethod,
        totalPrice: service.price,
        notes: Math.random() > 0.8 ? 'First time customer' : null,
      }
    })
  }

  // Inventory for Tenant 1
  const inventoryData = [
    { name: 'Shampoo - Premium', category: 'Hair Products', minStock: 10 },
    { name: 'Conditioner - Premium', category: 'Hair Products', minStock: 10 },
    { name: 'Hair Dye - Blonde', category: 'Hair Color', minStock: 8 },
    { name: 'Hair Dye - Brunette', category: 'Hair Color', minStock: 8 },
    { name: 'Hair Dye - Red', category: 'Hair Color', minStock: 5 },
    { name: 'Keratin Solution', category: 'Treatments', minStock: 3 },
    { name: 'Nail Polish - Red', category: 'Nail Products', minStock: 12 },
    { name: 'Nail Polish - Pink', category: 'Nail Products', minStock: 12 },
    { name: 'Nail Polish - Nude', category: 'Nail Products', minStock: 12 },
    { name: 'Gel Polish Kit', category: 'Nail Products', minStock: 5 },
    { name: 'Facial Cleanser', category: 'Skin Products', minStock: 6 },
    { name: 'Anti-Aging Serum', category: 'Skin Products', minStock: 4 },
    { name: 'Chemical Peel Solution', category: 'Skin Products', minStock: 3 },
    { name: 'Moisturizer - Professional', category: 'Skin Products', minStock: 8 },
    { name: 'Eyelash Adhesive', category: 'Beauty Products', minStock: 5 },
    { name: 'Lash Extensions Set', category: 'Beauty Products', minStock: 4 },
    { name: 'Waxing Strips', category: 'Beauty Products', minStock: 20 },
    { name: 'Makeup Foundation', category: 'Beauty Products', minStock: 8 },
    { name: 'Towels - Salon Grade', category: 'Supplies', minStock: 30 },
    { name: 'Capes - Styling', category: 'Supplies', minStock: 15 },
  ]
  for (const loc of tenant1Locations) {
    for (const item of inventoryData) {
      await prisma.inventoryItem.create({
        data: {
          tenantId: glamchainQatar.id,
          locationId: loc.id,
          name: item.name,
          category: item.category,
          quantity: randomInt(1, 40),
          minStock: item.minStock,
          unitPrice: randomFloat(15, 250),
          supplier: randomItem(['Beauty Supply Qatar', 'Pro Salon Distributors', 'Luxe Products GCC', 'Salon Direct ME']),
          lastRestocked: randomDate(new Date('2026-04-01'), new Date('2026-05-20')),
        }
      })
    }
  }

  // Expenses for Tenant 1
  const expenseCategories = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Insurance', 'Maintenance', 'Equipment']
  for (const loc of tenant1Locations) {
    for (const cat of expenseCategories) {
      const numExpenses = randomInt(1, 3)
      for (let i = 0; i < numExpenses; i++) {
        await prisma.expense.create({
          data: {
            tenantId: glamchainQatar.id,
            locationId: loc.id,
            category: cat,
            description: `${cat} expense for ${loc.name}`,
            amount: cat === 'Rent' ? randomFloat(10000, 30000) : cat === 'Salaries' ? randomFloat(15000, 45000) : randomFloat(300, 6000),
            date: randomDate(new Date('2026-01-01'), new Date('2026-05-27')),
          }
        })
      }
    }
  }

  // ============================================================
  // TENANT 2: Azure Med Spa Dubai (a second SaaS customer)
  // Proves multi-tenancy: Tenant 1 users must NOT see Tenant 2 data,
  // and vice versa. Same phone numbers can exist in both tenants'
  // customer lists without conflict.
  // ============================================================
  const azureDubai = await prisma.tenant.create({
    data: {
      name: 'Azure Med Spa',
      slug: 'azure-med-spa',
      contactEmail: 'admin@azuremedspa.ae',
      contactPhone: '+971 4 555 0100',
      primaryColor: '#0EA5E9',
      accentColor: '#1E3A8A',
      monogram: 'AM',
      logoUrl: null,
      timezone: 'Asia/Dubai',
      currency: 'AED',
      locale: 'en',
      plan: 'free',
      showBranding: true,   // free tier — shows "Powered by GlamChain"
      isActive: true,
    },
  })

  // Location for Tenant 2
  const dubaiMarina = await prisma.location.create({
    data: { tenantId: azureDubai.id, name: 'Azure Med Spa Dubai Marina', address: 'Dubai Marina Walk, Tower 1', city: 'Dubai', phone: '+971 4 555 0101', email: 'marina@azuremedspa.ae', openTime: '09:00', closeTime: '18:00' }
  })

  // Users for Tenant 2 — separate from Tenant 1
  await prisma.user.create({
    data: { email: 'owner@azuremedspa.ae', name: 'Layla Al-Rashid', password: defaultPassword, role: 'owner', phone: generatePhoneUae(), locationId: dubaiMarina.id, tenantId: azureDubai.id, isActive: true }
  })
  await prisma.user.create({
    data: { email: 'reception@azuremedspa.ae', name: 'Omar Hassan', password: defaultPassword, role: 'receptionist', phone: generatePhoneUae(), locationId: dubaiMarina.id, tenantId: azureDubai.id, isActive: true }
  })

  // Services for Tenant 2 — DIFFERENT catalog than Tenant 1 (proves services are tenant-scoped)
  const tenant2ServiceData = [
    { name: 'Skin Consultation', category: 'Dermatology', duration: 20, price: 250.00, description: 'Initial consultation with dermatologist' },
    { name: 'Botox / Dysport', category: 'Aesthetic', duration: 30, price: 1200.00, description: 'Wrinkle-relaxing injections' },
    { name: 'Dermal Fillers', category: 'Aesthetic', duration: 45, price: 2200.00, description: 'Hyaluronic acid volume restoration' },
    { name: 'Laser Hair Removal - Small Area', category: 'Laser', duration: 30, price: 600.00, description: 'Upper lip, chin, or underarms' },
    { name: 'Laser Hair Removal - Large Area', category: 'Laser', duration: 60, price: 1500.00, description: 'Full legs or back' },
    { name: 'PRP / Vampire Facial', category: 'Aesthetic', duration: 75, price: 1800.00, description: 'Platelet-rich plasma skin rejuvenation' },
    { name: 'HydraFacial', category: 'Skin', duration: 60, price: 800.00, description: 'Multi-step hydrating facial' },
    { name: 'Chemical Peel - Medical Grade', category: 'Skin', duration: 45, price: 1100.00, description: 'TCA or glycolic acid resurfacing' },
    { name: 'Microneedling', category: 'Aesthetic', duration: 60, price: 950.00, description: 'Collagen induction therapy' },
    { name: 'CoolSculpting', category: 'Body', duration: 60, price: 2500.00, description: 'Fat-freezing body contouring' },
  ]
  const tenant2Services: Awaited<ReturnType<typeof prisma.service.create>>[] = []
  for (const s of tenant2ServiceData) {
    tenant2Services.push(await prisma.service.create({ data: { tenantId: azureDubai.id, ...s } }))
  }

  // Stylists (Practitioners) for Tenant 2
  const tenant2StylistNames = [
    'Dr. Leila Farouk', 'Dr. Mariam Saeed', 'Dr. Yusuf Khan',
    'Aisha Al-Mansoori', 'Priya Sharma', 'Dr. Khalid Al-Noor',
  ]
  const tenant2Specs = ['Dermatologist', 'Aesthetic Nurse', 'Laser Technician', 'Skincare Therapist']
  const tenant2Stylists: Awaited<ReturnType<typeof prisma.stylist.create>>[] = []
  for (let i = 0; i < tenant2StylistNames.length; i++) {
    tenant2Stylists.push(await prisma.stylist.create({
      data: {
        tenantId: azureDubai.id,
        name: tenant2StylistNames[i],
        email: `${tenant2StylistNames[i].toLowerCase().replace(/[^a-z]+/g, '.')}@azuremedspa.ae`,
        phone: generatePhoneUae(),
        locationId: dubaiMarina.id,
        specialization: tenant2Specs[i % tenant2Specs.length],
        rating: randomFloat(4.0, 5.0),
        totalReviews: randomInt(20, 80),
        commissionRate: 0,
        isActive: true,
      }
    }))
  }

  // Customers for Tenant 2 (smaller dataset)
  const tenant2Customers: Awaited<ReturnType<typeof prisma.customer.create>>[] = []
  for (let i = 0; i < 50; i++) {
    const firstName = randomItem(firstNames)
    const lastName = randomItem(lastNames)
    tenant2Customers.push(await prisma.customer.create({
      data: {
        tenantId: azureDubai.id,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
        phone: generatePhoneUae(),
        locationId: dubaiMarina.id,
        loyaltyPoints: randomInt(0, 300),
        totalSpent: randomFloat(100, 8000),
        totalVisits: randomInt(1, 20),
        lastVisit: randomDate(new Date('2025-06-01'), new Date('2026-05-27')),
        notes: Math.random() > 0.8 ? 'VIP client' : null,
      }
    }))
  }

  // Appointments for Tenant 2
  for (let i = 0; i < 150; i++) {
    const stylist = randomItem(tenant2Stylists)
    const service = randomItem(tenant2Services)
    const customer = randomItem(tenant2Customers)
    const date = randomDate(threeMonthsAgo, now)

    const openHour = parseInt(dubaiMarina.openTime.split(':')[0])
    const closeHour = parseInt(dubaiMarina.closeTime.split(':')[0])
    date.setHours(randomInt(openHour, closeHour - 1), randomItem([0, 15, 30, 45]), 0, 0)

    let status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
    if (date > now) {
      status = Math.random() > 0.3 ? 'confirmed' : 'pending'
    } else {
      const rand = Math.random()
      if (rand < 0.55) status = 'completed'
      else if (rand < 0.7) status = 'confirmed'
      else if (rand < 0.82) status = 'cancelled'
      else if (rand < 0.92) status = 'no_show'
      else status = 'pending'
    }
    const paymentMethod = status === 'completed' ? randomItem(paymentMethods) : null

    await prisma.appointment.create({
      data: {
        tenantId: azureDubai.id,
        locationId: dubaiMarina.id,
        customerId: customer.id,
        stylistId: stylist.id,
        serviceId: service.id,
        date,
        status,
        paymentMethod,
        totalPrice: service.price,
        notes: Math.random() > 0.85 ? 'First-time patient' : null,
      }
    })
  }

  // Inventory for Tenant 2 (different supplies than a salon)
  const tenant2Inventory = [
    { name: 'Botox Vial (100U)', category: 'Injectables', minStock: 5 },
    { name: 'Dermal Filler Syringe', category: 'Injectables', minStock: 5 },
    { name: 'PRP Kit', category: 'Injectables', minStock: 3 },
    { name: 'Laser Cartridge - Diode', category: 'Laser Supplies', minStock: 2 },
    { name: 'HydraFacial Tip - Active-4', category: 'HydraFacial', minStock: 10 },
    { name: 'Chemical Peel - TCA 25%', category: 'Peels', minStock: 3 },
    { name: 'Microneedling Cartridge', category: 'Microneedling', minStock: 8 },
    { name: 'CoolSculpting Applicator - Small', category: 'Body Contouring', minStock: 2 },
    { name: 'Numbing Cream - 5% Lidocaine', category: 'Topical', minStock: 15 },
    { name: 'Syringes - Insulin 1ml', category: 'Supplies', minStock: 100 },
  ]
  for (const item of tenant2Inventory) {
    await prisma.inventoryItem.create({
      data: {
        tenantId: azureDubai.id,
        locationId: dubaiMarina.id,
        name: item.name,
        category: item.category,
        quantity: randomInt(1, 20),
        minStock: item.minStock,
        unitPrice: randomFloat(50, 800),
        supplier: randomItem(['Aesthetic Supplies UAE', 'MedSpa Direct', 'Gulf Medical Distributors']),
        lastRestocked: randomDate(new Date('2026-04-01'), new Date('2026-05-20')),
      }
    })
  }

  // Expenses for Tenant 2
  for (const cat of ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Insurance', 'Maintenance', 'Equipment']) {
    await prisma.expense.create({
      data: {
        tenantId: azureDubai.id,
        locationId: dubaiMarina.id,
        category: cat,
        description: `${cat} expense for Azure Med Spa Dubai Marina`,
        amount: cat === 'Rent' ? randomFloat(25000, 60000) : cat === 'Salaries' ? randomFloat(30000, 80000) : randomFloat(500, 12000),
        date: randomDate(new Date('2026-01-01'), new Date('2026-05-27')),
      }
    })
  }

  // ============================================================
  // TENANT 3: Nour Beauty Lounge Cairo (Egyptian salon chain — Faisal Street demo)
  // Localized for the Egyptian market: +20 phones, EGP pricing, ar-EG locale,
  // Africa/Cairo timezone (matches the founder's home market).
  // ============================================================
  const noorCairo = await prisma.tenant.create({
    data: {
      name: 'Nour Beauty Lounge',
      slug: 'noor-beauty-lounge',
      contactEmail: 'admin@noorbeauty.eg',
      contactPhone: '+20 2 2735 0000',
      primaryColor: '#0F766E',  // teal — matches the standalone widget's default
      accentColor: '#1E3A8A',
      monogram: 'NB',
      logoUrl: null,
      timezone: 'Africa/Cairo',  // matches the founder's TZ
      currency: 'EGP',
      locale: 'ar-EG',          // Egyptian Arabic dialect — most widely understood Arabic dialect
      plan: 'pro',
      showBranding: false,
      isActive: true,
    },
  })

  // Egyptian locations — Cairo's two upscale salon districts
  const zamalek = await prisma.location.create({
    data: {
      tenantId: noorCairo.id,
      name: 'Nour Beauty — Zamalek',
      address: '26 July Street, Zamalek',
      city: 'Cairo',
      phone: '+20 2 2735 0101',
      email: 'zamalek@noorbeauty.eg',
      openTime: '10:00',
      closeTime: '22:00',
    },
  })
  const newCairo = await prisma.location.create({
    data: {
      tenantId: noorCairo.id,
      name: 'Nour Beauty — New Cairo',
      address: 'Street 9, Fifth Settlement',
      city: 'New Cairo',
      phone: '+20 2 2735 0202',
      email: 'newcairo@noorbeauty.eg',
      openTime: '10:00',
      closeTime: '21:00',
    },
  })
  // Also a Faisal Street location (the demo target — Giza)
  const faisal = await prisma.location.create({
    data: {
      tenantId: noorCairo.id,
      name: 'Nour Beauty — Faisal Street',
      address: 'Faisal Street, Giza',
      city: 'Giza',
      phone: '+20 2 2735 0303',
      email: 'faisal@noorbeauty.eg',
      openTime: '10:00',
      closeTime: '22:00',
    },
  })
  const tenant3Locations = [zamalek, newCairo, faisal]

  // Egyptian users for Tenant 3
  await prisma.user.create({
    data: {
      email: 'owner@noorbeauty.eg',
      name: 'Mariam Adel',
      password: defaultPassword,
      role: 'owner',
      phone: '+20 100 123 4567',  // Egyptian mobile: 010/011/012/015 prefix + 8 digits
      locationId: zamalek.id,
      tenantId: noorCairo.id,
      isActive: true,
    },
  })
  await prisma.user.create({
    data: {
      email: 'reception.faisal@noorbeauty.eg',
      name: 'Yasmin Hassan',
      password: defaultPassword,
      role: 'receptionist',
      phone: '+20 122 987 6543',
      locationId: faisal.id,
      tenantId: noorCairo.id,
      isActive: true,
    },
  })

  // Egyptian service catalog — EGP pricing (significantly lower than GCC)
  // Prices are realistic for mid-tier Cairo salons in 2025-2026
  const tenant3ServiceData = [
    // Hair services
    { name: 'Haircut - Women', category: 'Hair', duration: 60, price: 350.00, description: 'قص شعر نسائي' },
    { name: 'Haircut - Men', category: 'Hair', duration: 30, price: 100.00, description: 'قص شعر رجالي' },
    { name: 'Hair Coloring', category: 'Hair', duration: 120, price: 800.00, description: 'صبغة شعر كاملة' },
    { name: 'Highlights', category: 'Hair', duration: 150, price: 1200.00, description: 'هايلاتس' },
    { name: 'Keratin Treatment', category: 'Hair', duration: 180, price: 2500.00, description: 'علاج الكيراتين' },
    { name: 'Blowout & Styling', category: 'Hair', duration: 45, price: 200.00, description: 'سشوار وتصفيف' },
    { name: 'Hair Botox', category: 'Hair', duration: 90, price: 1800.00, description: 'بوتوكس الشعر' },
    { name: 'Scalp Treatment', category: 'Hair', duration: 45, price: 400.00, description: 'علاج فروة الرأس' },
    // Nails
    { name: 'Manicure', category: 'Nails', duration: 45, price: 200.00, description: 'مانيكير' },
    { name: 'Gel Manicure', category: 'Nails', duration: 60, price: 350.00, description: 'مانيكير جل' },
    { name: 'Pedicure', category: 'Nails', duration: 60, price: 250.00, description: 'باديكير' },
    { name: 'Acrylic Nails', category: 'Nails', duration: 90, price: 600.00, description: 'أظافر أكريليك' },
    // Skin
    { name: 'Classic Facial', category: 'Skin', duration: 60, price: 500.00, description: 'تنظيف بشرة كلاسيك' },
    { name: 'Premium Facial', category: 'Skin', duration: 90, price: 900.00, description: 'تنظيف بشرة بريميوم' },
    { name: 'Chemical Peel', category: 'Skin', duration: 45, price: 800.00, description: 'تقشير كيميائي' },
    { name: 'HydraFacial', category: 'Skin', duration: 60, price: 1200.00, description: 'هيدرا فيشال' },
    // Beauty
    { name: 'Eyebrow Threading', category: 'Beauty', duration: 15, price: 75.00, description: 'إزالة شعر الحواجب' },
    { name: 'Eyelash Extensions', category: 'Beauty', duration: 90, price: 700.00, description: 'تركيب رموش' },
    { name: 'Makeup Application', category: 'Beauty', duration: 60, price: 600.00, description: 'مكياج' },
    { name: 'Henna Application', category: 'Beauty', duration: 60, price: 250.00, description: 'حناء' },
    // Spa
    { name: 'Full Body Massage - 60min', category: 'Spa', duration: 60, price: 800.00, description: 'مساج كامل الجسم' },
    { name: 'Moroccan Bath (Hammam)', category: 'Spa', duration: 75, price: 600.00, description: 'حمام مغربي' },
  ]
  const tenant3Services: Awaited<ReturnType<typeof prisma.service.create>>[] = []
  for (const s of tenant3ServiceData) {
    tenant3Services.push(await prisma.service.create({ data: { tenantId: noorCairo.id, ...s } }))
  }

  // Egyptian stylists (practitioners)
  const egyptianStylistNames = [
    'Aya Mahmoud', 'Salma Ibrahim', 'Heba Mostafa', 'Nour Adel',
    'Reem Khaled', 'Mariam Sherif', 'Dina Tarek', 'Amr Saad',
    'Mohamed Fouad', 'Hend Yasser', 'Sherine Wagih', 'Layla Hossam',
  ]
  const egyptianSpecs = ['Hair Specialist', 'Color Expert', 'Nail Artist', 'Skin Care Specialist', 'Beauty Therapist', 'Massage Therapist']
  const tenant3Stylists: Awaited<ReturnType<typeof prisma.stylist.create>>[] = []
  for (let i = 0; i < egyptianStylistNames.length; i++) {
    const loc = tenant3Locations[i % 3]
    const spec = egyptianSpecs[i % egyptianSpecs.length]
    tenant3Stylists.push(await prisma.stylist.create({
      data: {
        tenantId: noorCairo.id,
        name: egyptianStylistNames[i],
        email: `${egyptianStylistNames[i].toLowerCase().replace(/[^a-z]+/g, '.')}@noorbeauty.eg`,
        phone: `+20 ${randomItem(['100', '101', '102', '122', '106', '155'])} ${randomInt(1000000, 9999999)}`,
        locationId: loc.id,
        specialization: spec,
        rating: randomFloat(4.0, 5.0),
        totalReviews: randomInt(20, 200),
        commissionRate: randomFloat(0.20, 0.35),
        isActive: true,
      }
    }))
  }

  // Egyptian customers — Egyptian names + phones
  const egyptianFirstNames = ['Mariam', 'Salma', 'Aya', 'Heba', 'Nour', 'Reem', 'Dina', 'Sherine', 'Hend', 'Mona', 'Amr', 'Mohamed', 'Khaled', 'Tarek', 'Sherif', 'Mostafa', 'Yasmin', 'Dalia', 'Laila', 'Hanan', 'Esraa', 'Asmaa', 'Marwa', 'Sara', 'Farida', 'Nadia', 'Rania', 'Eman', 'Ghada', 'Walaa']
  const egyptianLastNames = ['Adel', 'Ibrahim', 'Mostafa', 'Mahmoud', 'Hassan', 'Khaled', 'Sherif', 'Said', 'Fouad', 'Abdelrahman', 'Tarek', 'Wagih', 'Hossam', 'Saad', 'Rashad', 'Galal', 'Abdelaziz', 'El-Sayed', 'Fathy', 'Metwally']
  const tenant3Customers: Awaited<ReturnType<typeof prisma.customer.create>>[] = []
  for (let i = 0; i < 120; i++) {
    const firstName = randomItem(egyptianFirstNames)
    const lastName = randomItem(egyptianLastNames)
    tenant3Customers.push(await prisma.customer.create({
      data: {
        tenantId: noorCairo.id,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}${i}@gmail.com`,
        phone: `+20 ${randomItem(['100', '101', '102', '122', '106', '155'])} ${randomInt(1000000, 9999999)}`,
        locationId: randomItem(tenant3Locations).id,
        loyaltyPoints: randomInt(0, 300),
        totalSpent: randomFloat(100, 5000),
        totalVisits: randomInt(1, 30),
        lastVisit: randomDate(new Date('2025-06-01'), new Date('2026-05-27')),
        notes: Math.random() > 0.8 ? 'عميل مميز' : null,
      }
    }))
  }

  // Egyptian appointments (450 — proportional to the smaller customer base)
  for (let i = 0; i < 450; i++) {
    const loc = randomItem(tenant3Locations)
    const locationStylists = tenant3Stylists.filter(s => s.locationId === loc.id)
    const stylist = randomItem(locationStylists)
    const service = randomItem(tenant3Services)
    const customer = randomItem(tenant3Customers)
    const date = randomDate(threeMonthsAgo, now)

    const openHour = parseInt(loc.openTime.split(':')[0])
    const closeHour = parseInt(loc.closeTime.split(':')[0])
    date.setHours(randomInt(openHour, closeHour - 1), randomItem([0, 15, 30, 45]), 0, 0)

    let status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
    if (date > now) {
      status = Math.random() > 0.3 ? 'confirmed' : 'pending'
    } else {
      const rand = Math.random()
      if (rand < 0.55) status = 'completed'
      else if (rand < 0.7) status = 'confirmed'
      else if (rand < 0.82) status = 'cancelled'
      else if (rand < 0.92) status = 'no_show'
      else status = 'pending'
    }
    const paymentMethod = status === 'completed' ? randomItem(['cash', 'card', 'digital_wallet']) : null

    await prisma.appointment.create({
      data: {
        tenantId: noorCairo.id,
        locationId: loc.id,
        customerId: customer.id,
        stylistId: stylist.id,
        serviceId: service.id,
        date,
        status,
        paymentMethod,
        totalPrice: service.price,
        notes: Math.random() > 0.85 ? 'عميل لأول مرة' : null,
      }
    })
  }

  // Egyptian inventory
  const egyptianInventory = [
    { name: 'Shampoo - L\'Oréal', category: 'Hair Products', minStock: 8 },
    { name: 'Conditioner - L\'Oréal', category: 'Hair Products', minStock: 8 },
    { name: 'Hair Dye - Black', category: 'Hair Color', minStock: 10 },
    { name: 'Hair Dye - Brown', category: 'Hair Color', minStock: 10 },
    { name: 'Hair Dye - Blonde', category: 'Hair Color', minStock: 5 },
    { name: 'Keratin Solution', category: 'Treatments', minStock: 3 },
    { name: 'Nail Polish - Red', category: 'Nail Products', minStock: 12 },
    { name: 'Nail Polish - Nude', category: 'Nail Products', minStock: 12 },
    { name: 'Acrylic Powder', category: 'Nail Products', minStock: 5 },
    { name: 'Facial Cleanser', category: 'Skin Products', minStock: 6 },
    { name: 'Moroccan Black Soap', category: 'Spa Products', minStock: 10 },
    { name: 'Henna Powder', category: 'Beauty Products', minStock: 8 },
    { name: 'Massage Oil - Lavender', category: 'Spa Products', minStock: 5 },
    { name: 'Loofah - Natural', category: 'Spa Products', minStock: 15 },
    { name: 'Towels - Salon Grade', category: 'Supplies', minStock: 25 },
  ]
  for (const loc of tenant3Locations) {
    for (const item of egyptianInventory) {
      await prisma.inventoryItem.create({
        data: {
          tenantId: noorCairo.id,
          locationId: loc.id,
          name: item.name,
          category: item.category,
          quantity: randomInt(1, 30),
          minStock: item.minStock,
          unitPrice: randomFloat(20, 400),
          supplier: randomItem(['Cosmetics Egypt', 'Beauty Supplies Cairo', 'Salon Direct EG', 'Pro Beauty Distributors']),
          lastRestocked: randomDate(new Date('2026-04-01'), new Date('2026-05-20')),
        }
      })
    }
  }

  // Egyptian expenses — EGP pricing (rent/salaries much lower than GCC)
  for (const loc of tenant3Locations) {
    for (const cat of ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Insurance', 'Maintenance', 'Equipment']) {
      const numExpenses = randomInt(1, 2)
      for (let i = 0; i < numExpenses; i++) {
        await prisma.expense.create({
          data: {
            tenantId: noorCairo.id,
            locationId: loc.id,
            category: cat,
            description: `${cat} expense for ${loc.name}`,
            amount: cat === 'Rent' ? randomFloat(15000, 40000) : cat === 'Salaries' ? randomFloat(8000, 25000) : randomFloat(200, 4000),
            date: randomDate(new Date('2026-01-01'), new Date('2026-05-27')),
          }
        })
      }
    }
  }

  console.log('================================================')
  console.log('Multi-tenant seed data created successfully!')
  console.log('================================================')
  console.log('')
  console.log('TENANT 1: GlamChain Qatar (plan: pro)')
  console.log(`  Locations: ${tenant1Locations.length} (West Bay, Mall of Qatar, The Pearl)`)
  console.log(`  Services: ${tenant1Services.length}`)
  console.log(`  Stylists: ${tenant1Stylists.length}`)
  console.log(`  Customers: ${tenant1Customers.length}`)
  console.log(`  Appointments: 600`)
  console.log('')
  console.log('TENANT 2: Azure Med Spa (plan: free, showBranding: true)')
  console.log(`  Locations: 1 (Dubai Marina)`)
  console.log(`  Services: ${tenant2Services.length} (dermatology-focused, different catalog)`)
  console.log(`  Stylists: ${tenant2Stylists.length}`)
  console.log(`  Customers: ${tenant2Customers.length}`)
  console.log(`  Appointments: 150`)
  console.log('')
  console.log('TENANT 3: Nour Beauty Lounge (Egyptian, plan: pro, locale: ar-EG, TZ: Africa/Cairo)')
  console.log(`  Locations: ${tenant3Locations.length} (Zamalek, New Cairo, Faisal Street)`)
  console.log(`  Services: ${tenant3Services.length} (Arabic descriptions, EGP pricing)`)
  console.log(`  Stylists: ${tenant3Stylists.length}`)
  console.log(`  Customers: ${tenant3Customers.length}`)
  console.log(`  Appointments: 450`)
  console.log('')
  console.log('================================================')
  console.log('Logins:')
  console.log('  Platform super_admin : admin@glamchain.com / password123')
  console.log('  Tenant 1 owner       : owner.westbay@glamchain.qa / password123')
  console.log('  Tenant 2 owner       : owner@azuremedspa.ae / password123')
  console.log('  Tenant 3 owner       : owner@noorbeauty.eg / password123  (EGYPT — Faisal Street demo)')
  console.log('================================================')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
