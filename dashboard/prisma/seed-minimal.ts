/**
 * Minimal multi-tenant seed for Neon deployment.
 * Creates all 3 tenants with a representative subset of data — enough to demo
 * login + dashboard + booking for each tenant, without the 5-minute runtime
 * of the full seed against a remote DB.
 *
 * For the full dataset (600+ appointments, 370 customers), run `npm run db:seed`
 * locally with DATABASE_URL pointing at Neon.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clean all tables
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

  const defaultPassword = await bcrypt.hash('password123', 10)

  // Platform-level super_admin (no tenantId — can see all tenants)
  await prisma.user.create({
    data: { email: 'admin@glamchain.com', name: 'Sarah Mitchell', password: defaultPassword, role: 'super_admin', phone: '+974 4411 0001', isActive: true }
  })

  // ============================================================
  // TENANT 1: GlamChain Qatar
  // ============================================================
  const t1 = await prisma.tenant.create({
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
      showBranding: false,
      isActive: true,
    },
  })
  const loc1 = await prisma.location.create({
    data: { tenantId: t1.id, name: 'West Bay Salon', address: '123 Al Corniche Street', city: 'Doha', phone: '+974 4411 0101', email: 'westbay@glamchain.qa', openTime: '08:00', closeTime: '22:00' }
  })
  await prisma.user.create({
    data: { email: 'owner.westbay@glamchain.qa', name: 'Michael Chen', password: defaultPassword, role: 'owner', phone: '+974 4411 0002', locationId: loc1.id, tenantId: t1.id, isActive: true }
  })
  const s1 = await prisma.service.create({ data: { tenantId: t1.id, name: 'Haircut - Women', category: 'Hair', duration: 60, price: 250.00, description: 'Precision cut tailored to your style' } })
  const s2 = await prisma.service.create({ data: { tenantId: t1.id, name: 'Manicure', category: 'Nails', duration: 45, price: 150.00, description: 'Classic manicure with polish' } })
  const s3 = await prisma.service.create({ data: { tenantId: t1.id, name: 'Facial - Premium', category: 'Skin', duration: 90, price: 500.00, description: 'Anti-aging facial with serums' } })
  const st1 = await prisma.stylist.create({ data: { tenantId: t1.id, name: 'Aria Thompson', email: 'aria.thompson@glamchain.qa', phone: '+974 5555 0001', locationId: loc1.id, specialization: 'Hair Specialist', rating: 4.8, totalReviews: 95, commissionRate: 0.3, isActive: true } })
  const c1 = await prisma.customer.create({ data: { tenantId: t1.id, name: 'Emma Smith', email: 'emma@email.com', phone: '+974 6666 0001', locationId: loc1.id, loyaltyPoints: 120, totalSpent: 1250, totalVisits: 5, lastVisit: new Date('2026-05-01') } })
  // 10 past appointments
  for (let i = 0; i < 10; i++) {
    const date = new Date(2026, 4, 1 + i, 10 + (i % 8))
    await prisma.appointment.create({ data: { tenantId: t1.id, locationId: loc1.id, customerId: c1.id, stylistId: st1.id, serviceId: [s1, s2, s3][i % 3].id, date, status: i < 7 ? 'completed' : 'confirmed', totalPrice: [s1, s2, s3][i % 3].price } })
  }

  // ============================================================
  // TENANT 2: Azure Med Spa Dubai
  // ============================================================
  const t2 = await prisma.tenant.create({
    data: {
      name: 'Azure Med Spa',
      slug: 'azure-med-spa',
      contactEmail: 'admin@azuremedspa.ae',
      contactPhone: '+971 4 555 0100',
      primaryColor: '#0EA5E9',
      accentColor: '#1E3A8A',
      monogram: 'AM',
      timezone: 'Asia/Dubai',
      currency: 'AED',
      locale: 'en',
      plan: 'free',
      showBranding: true,
      isActive: true,
    },
  })
  const loc2 = await prisma.location.create({
    data: { tenantId: t2.id, name: 'Azure Med Spa Dubai Marina', address: 'Dubai Marina Walk, Tower 1', city: 'Dubai', phone: '+971 4 555 0101', email: 'marina@azuremedspa.ae', openTime: '09:00', closeTime: '18:00' }
  })
  await prisma.user.create({
    data: { email: 'owner@azuremedspa.ae', name: 'Layla Al-Rashid', password: defaultPassword, role: 'owner', phone: '+971 50 123 4567', locationId: loc2.id, tenantId: t2.id, isActive: true }
  })
  const as1 = await prisma.service.create({ data: { tenantId: t2.id, name: 'Botox / Dysport', category: 'Aesthetic', duration: 30, price: 1200.00, description: 'Wrinkle-relaxing injections' } })
  const as2 = await prisma.service.create({ data: { tenantId: t2.id, name: 'Dermal Fillers', category: 'Aesthetic', duration: 45, price: 2200.00, description: 'Hyaluronic acid volume restoration' } })
  const as3 = await prisma.service.create({ data: { tenantId: t2.id, name: 'HydraFacial', category: 'Skin', duration: 60, price: 800.00, description: 'Multi-step hydrating facial' } })
  const ast1 = await prisma.stylist.create({ data: { tenantId: t2.id, name: 'Dr. Leila Farouk', email: 'leila.farouk@azuremedspa.ae', phone: '+971 50 987 6543', locationId: loc2.id, specialization: 'Dermatologist', rating: 4.9, totalReviews: 45, commissionRate: 0, isActive: true } })
  const ac1 = await prisma.customer.create({ data: { tenantId: t2.id, name: 'Sarah Johnson', email: 'sarah@email.com', phone: '+971 50 555 0001', locationId: loc2.id, loyaltyPoints: 80, totalSpent: 4200, totalVisits: 3, lastVisit: new Date('2026-04-15') } })
  for (let i = 0; i < 8; i++) {
    const date = new Date(2026, 3, 5 + i, 11 + (i % 6))
    await prisma.appointment.create({ data: { tenantId: t2.id, locationId: loc2.id, customerId: ac1.id, stylistId: ast1.id, serviceId: [as1, as2, as3][i % 3].id, date, status: i < 5 ? 'completed' : 'confirmed', totalPrice: [as1, as2, as3][i % 3].price } })
  }

  // ============================================================
  // TENANT 3: Nour Beauty Lounge (Egypt — Faisal Street demo)
  // ============================================================
  const t3 = await prisma.tenant.create({
    data: {
      name: 'Nour Beauty Lounge',
      slug: 'noor-beauty-lounge',
      contactEmail: 'admin@noorbeauty.eg',
      contactPhone: '+20 2 2735 0000',
      primaryColor: '#0F766E',
      accentColor: '#1E3A8A',
      monogram: 'NB',
      timezone: 'Africa/Cairo',
      currency: 'EGP',
      locale: 'ar-EG',
      plan: 'pro',
      showBranding: false,
      isActive: true,
    },
  })
  // Three Egyptian locations
  const locFaisal = await prisma.location.create({
    data: { tenantId: t3.id, name: 'Nour Beauty — Faisal Street', address: 'Faisal Street, Giza', city: 'Giza', phone: '+20 2 2735 0303', email: 'faisal@noorbeauty.eg', openTime: '10:00', closeTime: '22:00' }
  })
  const locZamalek = await prisma.location.create({
    data: { tenantId: t3.id, name: 'Nour Beauty — Zamalek', address: '26 July Street, Zamalek', city: 'Cairo', phone: '+20 2 2735 0101', email: 'zamalek@noorbeauty.eg', openTime: '10:00', closeTime: '22:00' }
  })
  const locNewCairo = await prisma.location.create({
    data: { tenantId: t3.id, name: 'Nour Beauty — New Cairo', address: 'Street 9, Fifth Settlement', city: 'New Cairo', phone: '+20 2 2735 0202', email: 'newcairo@noorbeauty.eg', openTime: '10:00', closeTime: '21:00' }
  })
  await prisma.user.create({
    data: { email: 'owner@noorbeauty.eg', name: 'Mariam Adel', password: defaultPassword, role: 'owner', phone: '+20 100 123 4567', locationId: locZamalek.id, tenantId: t3.id, isActive: true }
  })
  await prisma.user.create({
    data: { email: 'reception.faisal@noorbeauty.eg', name: 'Yasmin Hassan', password: defaultPassword, role: 'receptionist', phone: '+20 122 987 6543', locationId: locFaisal.id, tenantId: t3.id, isActive: true }
  })
  // Egyptian service catalog (Arabic descriptions + EGP pricing)
  const esv = [
    { name: 'Haircut - Women', category: 'Hair', duration: 60, price: 350.00, description: 'قص شعر نسائي' },
    { name: 'Haircut - Men', category: 'Hair', duration: 30, price: 100.00, description: 'قص شعر رجالي' },
    { name: 'Hair Coloring', category: 'Hair', duration: 120, price: 800.00, description: 'صبغة شعر كاملة' },
    { name: 'Keratin Treatment', category: 'Hair', duration: 180, price: 2500.00, description: 'علاج الكيراتين' },
    { name: 'Manicure', category: 'Nails', duration: 45, price: 200.00, description: 'مانيكير' },
    { name: 'Pedicure', category: 'Nails', duration: 60, price: 250.00, description: 'باديكير' },
    { name: 'Classic Facial', category: 'Skin', duration: 60, price: 500.00, description: 'تنظيف بشرة كلاسيك' },
    { name: 'HydraFacial', category: 'Skin', duration: 60, price: 1200.00, description: 'هيدرا فيشال' },
    { name: 'Eyebrow Threading', category: 'Beauty', duration: 15, price: 75.00, description: 'إزالة شعر الحواجب' },
    { name: 'Makeup Application', category: 'Beauty', duration: 60, price: 600.00, description: 'مكياج' },
    { name: 'Moroccan Bath (Hammam)', category: 'Spa', duration: 75, price: 600.00, description: 'حمام مغربي' },
    { name: 'Full Body Massage - 60min', category: 'Spa', duration: 60, price: 800.00, description: 'مساج كامل الجسم' },
  ]
  const egyptianServices = []
  for (const s of esv) {
    egyptianServices.push(await prisma.service.create({ data: { tenantId: t3.id, ...s } }))
  }
  // Egyptian stylists
  const egyptianStylists = [
    { name: 'Aya Mahmoud', spec: 'Hair Specialist', loc: locZamalek.id },
    { name: 'Salma Ibrahim', spec: 'Color Expert', loc: locZamalek.id },
    { name: 'Heba Mostafa', spec: 'Nail Artist', loc: locFaisal.id },
    { name: 'Nour Adel', spec: 'Skin Care Specialist', loc: locFaisal.id },
    { name: 'Reem Khaled', spec: 'Beauty Therapist', loc: locNewCairo.id },
    { name: 'Mariam Sherif', spec: 'Massage Therapist', loc: locNewCairo.id },
  ]
  const eStylists = []
  for (const st of egyptianStylists) {
    eStylists.push(await prisma.stylist.create({
      data: { tenantId: t3.id, name: st.name, email: st.name.toLowerCase().replace(/[^a-z]+/g, '.') + '@noorbeauty.eg', phone: `+20 10${Math.floor(Math.random()*90000000+10000000)}`, locationId: st.loc, specialization: st.spec, rating: 4.7, totalReviews: 45, commissionRate: 0.3, isActive: true }
    }))
  }
  // Egyptian customers
  const egyptianNames = [
    ['Mariam', 'Adel'], ['Salma', 'Ibrahim'], ['Aya', 'Mahmoud'], ['Heba', 'Hassan'],
    ['Nour', 'Khaled'], ['Reem', 'Sherif'], ['Dina', 'Tarek'], ['Yasmin', 'Saad'],
    ['Mohamed', 'Fouad'], ['Sherine', 'Wagih'],
  ]
  const eCustomers = []
  for (let i = 0; i < egyptianNames.length; i++) {
    const [fn, ln] = egyptianNames[i]
    eCustomers.push(await prisma.customer.create({
      data: { tenantId: t3.id, name: `${fn} ${ln}`, email: `${fn.toLowerCase()}.${ln.toLowerCase()}@gmail.com`, phone: `+20 10${Math.floor(Math.random()*90000000+10000000)}`, locationId: [locZamalek.id, locFaisal.id, locNewCairo.id][i % 3], loyaltyPoints: Math.floor(Math.random()*200), totalSpent: Math.random()*3000+500, totalVisits: Math.floor(Math.random()*10+1), lastVisit: new Date(2026, 3 + (i%2), (i%28)+1) }
    }))
  }
  // Egyptian appointments (20 — enough to populate the dashboard)
  const statuses = ['completed', 'confirmed', 'pending', 'cancelled', 'no_show'] as const
  const payMethods = ['cash', 'card', 'digital_wallet'] as const
  for (let i = 0; i < 20; i++) {
    const loc = [locZamalek.id, locFaisal.id, locNewCairo.id][i % 3]
    const st = eStylists.filter(s => s.locationId === loc)[0]
    const svc = egyptianServices[i % egyptianServices.length]
    const cust = eCustomers[i % eCustomers.length]
    const date = new Date(2026, 3 + (i % 2), (i % 28) + 1, 10 + (i % 10), (i % 2) * 30)
    const status = i < 11 ? 'completed' : statuses[Math.floor(Math.random()*3)]
    await prisma.appointment.create({
      data: { tenantId: t3.id, locationId: loc, customerId: cust.id, stylistId: st.id, serviceId: svc.id, date, status, paymentMethod: status === 'completed' ? payMethods[i % 3] : null, totalPrice: svc.price }
    })
  }

  console.log('================================================')
  console.log('Multi-tenant seed (minimal) created successfully!')
  console.log('================================================')
  console.log(`TENANT 1: GlamChain Qatar — 1 location, 1 user, 3 services, 1 stylist, 1 customer, 10 appointments`)
  console.log(`TENANT 2: Azure Med Spa Dubai — 1 location, 1 user, 3 services, 1 stylist, 1 customer, 8 appointments`)
  console.log(`TENANT 3: Nour Beauty Lounge (Egypt) — 3 locations, 2 users, 12 services, 6 stylists, 10 customers, 20 appointments`)
  console.log('================================================')
  console.log('Logins (all password: password123):')
  console.log('  Platform admin     : admin@glamchain.com')
  console.log('  Tenant 1 owner     : owner.westbay@glamchain.qa')
  console.log('  Tenant 2 owner     : owner@azuremedspa.ae')
  console.log('  Tenant 3 owner      : owner@noorbeauty.eg  (EGYPT — Faisal Street ready)')
  console.log('================================================')
}

main()
  .catch((e) => { console.error('SEED FAILED:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
