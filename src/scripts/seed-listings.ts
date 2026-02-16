import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { UserModel } from '../models/User.js';
import { ListingModel } from '../models/Listing.js';

await mongoose.connect(env.mongoUri);

// Find or create a test user to be the author
let user = await UserModel.findOne({ phone: '+7 (900) 000-00-01' });
if (!user) {
  const passwordHash = await bcrypt.hash('test1234', 10);
  user = await UserModel.create({
    phone: '+7 (900) 000-00-01',
    firstName: 'Тест',
    lastName: 'Продавец',
    name: 'Тест Продавец',
    passwordHash,
    role: 'user',
    phoneVerified: true,
  });
  console.log('Created test user:', user._id);
} else {
  console.log('Using existing test user:', user._id);
}

const authorId = user._id.toString();
const authorName = `${user.firstName} ${user.lastName}`;
const authorPhone = user.phone;

// Placeholder images (publicly accessible)
const images = [
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
  'https://images.unsplash.com/photo-1600573472556-e636c2acda9e?w=800',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800',
];

const listings = [
  {
    title: 'Уютная 2-комнатная квартира в центре',
    description: 'Просторная квартира с евроремонтом в самом центре города. Панорамные окна, современная мебель, полностью укомплектована бытовой техникой. Рядом парк, школа, детский сад. Отличная транспортная доступность.',
    price: 5500000,
    paymentType: 'cash' as const,
    dealType: 'sale' as const,
    address: 'Москва, ул. Тверская, д. 15, кв. 42',
    propertyType: 'apartment' as const,
    apartmentType: 'secondary' as const,
    rooms: 2,
    area: 65,
    floor: 7,
    totalFloors: 12,
    lat: 55.764,
    lng: 37.605,
    images: [images[0], images[1]],
  },
  {
    title: 'Новостройка с видом на море',
    description: 'Квартира в новом ЖК "Морской бриз" с потрясающим видом на море. Сдача в 2026 году. Застройщик "Южный Берег" — надёжная компания с 15-летним опытом. Закрытая территория, подземный паркинг, детская площадка.',
    price: 2000000,
    paymentType: 'installment' as const,
    dealType: 'sale' as const,
    installmentMonths: 36,
    installmentMonthly: 85000,
    address: 'Сочи, ул. Приморская, д. 28',
    propertyType: 'apartment' as const,
    apartmentType: 'new' as const,
    developer: 'Южный Берег',
    complex: 'Морской бриз',
    rooms: 1,
    area: 42,
    floor: 15,
    totalFloors: 25,
    lat: 43.585,
    lng: 39.720,
    images: [images[2], images[3], images[4]],
  },
  {
    title: 'Просторный коттедж с бассейном',
    description: 'Загородный коттедж на участке 15 соток. Бассейн, баня, гараж на 2 машины. 4 спальни, 2 ванные комнаты, каминный зал. Полностью меблирован, готов к проживанию. Тихий район, лес рядом.',
    price: 18500000,
    paymentType: 'cash' as const,
    dealType: 'sale' as const,
    address: 'Московская обл., Одинцовский р-н, д. Барвиха',
    propertyType: 'house' as const,
    rooms: 4,
    area: 220,
    floor: 2,
    totalFloors: 2,
    lat: 55.728,
    lng: 37.272,
    images: [images[4], images[5], images[6]],
  },
  {
    title: 'Земельный участок ИЖС 10 соток',
    description: 'Ровный участок с коммуникациями: газ, электричество, водоснабжение. Подходит для строительства дома или дачи. Асфальтированный подъезд, соседи — жилые дома. Документы готовы к сделке.',
    price: 3200000,
    paymentType: 'cash' as const,
    dealType: 'sale' as const,
    address: 'Краснодарский край, г. Краснодар, пос. Северный',
    propertyType: 'land' as const,
    area: 1000,
    lat: 45.088,
    lng: 38.976,
    images: [images[6], images[7]],
  },
  {
    title: 'Офис в бизнес-центре класса А',
    description: 'Офисное помещение в современном бизнес-центре. Открытая планировка, панорамное остекление, кондиционирование. Парковка для сотрудников. Охрана 24/7, ресепшн. Идеально для IT-компании или консалтинга.',
    price: 12000000,
    paymentType: 'cash' as const,
    dealType: 'sale' as const,
    address: 'Санкт-Петербург, Невский пр., д. 100',
    propertyType: 'commercial' as const,
    area: 120,
    floor: 5,
    totalFloors: 18,
    lat: 59.932,
    lng: 30.349,
    images: [images[8], images[9]],
  },
  {
    title: 'Студия в ЖК "Зелёный квартал"',
    description: 'Компактная студия с качественной отделкой от застройщика. Встроенная кухня, санузел с душевой. ЖК с закрытой территорией, видеонаблюдение. В шаговой доступности метро и ТЦ.',
    price: 1200000,
    paymentType: 'installment' as const,
    dealType: 'sale' as const,
    installmentMonths: 24,
    installmentMonthly: 62000,
    address: 'Краснодар, ул. Красных Партизан, д. 55',
    propertyType: 'apartment' as const,
    apartmentType: 'new' as const,
    developer: 'ЮгСтрой',
    complex: 'Зелёный квартал',
    rooms: 1,
    area: 28,
    floor: 3,
    totalFloors: 16,
    lat: 45.035,
    lng: 38.975,
    images: [images[1], images[0]],
  },
  {
    title: '3-комнатная квартира по переуступке',
    description: 'Продаю право требования по ДДУ. Квартира в строящемся комплексе от крупного застройщика. Сдача — конец 2026 года. Выгодная цена ниже рынка. Панорамный вид, высокий этаж.',
    price: 7800000,
    paymentType: 'cash' as const,
    dealType: 'assignment' as const,
    dduNumber: 'ДДУ-2024/1587',
    dduDate: new Date('2024-06-15'),
    assignmentOriginalPrice: 6500000,
    completionDate: new Date('2026-12-01'),
    address: 'Москва, ул. Академика Королёва, д. 12',
    propertyType: 'apartment' as const,
    apartmentType: 'new' as const,
    developer: 'ПИК',
    complex: 'Саларьево Парк',
    rooms: 3,
    area: 78,
    floor: 19,
    totalFloors: 24,
    lat: 55.622,
    lng: 37.418,
    images: [images[3], images[5], images[7]],
  },
  {
    title: 'Дом с террасой и садом',
    description: 'Уютный двухэтажный дом в тихом районе. Большая терраса с барбекю-зоной, фруктовый сад. 3 спальни, 2 санузла, гостиная с камином. Подключены все коммуникации. До центра 15 минут на машине.',
    price: 9200000,
    paymentType: 'cash' as const,
    dealType: 'sale' as const,
    address: 'Ростов-на-Дону, пос. Александровка',
    propertyType: 'house' as const,
    rooms: 3,
    area: 150,
    floor: 2,
    totalFloors: 2,
    lat: 47.222,
    lng: 39.718,
    images: [images[5], images[4], images[9]],
  },
  {
    title: 'Квартира с ремонтом под ключ',
    description: 'Полностью готовая квартира: дизайнерский ремонт, встроенная кухня, вся необходимая техника. Два балкона, вид на парк. Тихий двор, охраняемая парковка. Документы чистые, свободна.',
    price: 4300000,
    paymentType: 'cash' as const,
    dealType: 'sale' as const,
    address: 'Казань, ул. Баумана, д. 36, кв. 18',
    propertyType: 'apartment' as const,
    apartmentType: 'secondary' as const,
    rooms: 2,
    area: 55,
    floor: 4,
    totalFloors: 9,
    lat: 55.788,
    lng: 49.122,
    images: [images[0], images[2], images[8]],
  },
  {
    title: 'Торговое помещение на первом этаже',
    description: 'Помещение на первой линии с отдельным входом и витриной. Высокий трафик, проходное место. Подходит для магазина, аптеки, салона красоты. Площадь 80 м², потолки 3.5 м. Все коммуникации.',
    price: 8500000,
    paymentType: 'installment' as const,
    dealType: 'sale' as const,
    installmentMonths: 12,
    installmentMonthly: 500000,
    address: 'Новосибирск, Красный пр., д. 65',
    propertyType: 'commercial' as const,
    area: 80,
    floor: 1,
    totalFloors: 10,
    lat: 55.030,
    lng: 82.920,
    images: [images[9], images[8], images[7]],
  },
];

let created = 0;
for (const data of listings) {
  const existing = await ListingModel.findOne({ title: data.title, authorId });
  if (existing) {
    console.log(`  Skip (exists): ${data.title}`);
    continue;
  }

  await ListingModel.create({
    ...data,
    authorId,
    authorName,
    authorPhone,
    status: 'active',
    moderationStatus: 'approved',
    views: 0,
  });
  created++;
  console.log(`  Created: ${data.title}`);
}

console.log(`\nDone! Created ${created} listings (skipped ${listings.length - created} existing).`);
await mongoose.disconnect();
