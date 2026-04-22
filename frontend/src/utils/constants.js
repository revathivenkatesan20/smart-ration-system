export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const MAPPLS_API_KEY = 'vuuitbpnpatsbqofzadioveardrmblbqdkaw';

export const MOCK = {
  user: {
    id: 1,
    name: "Murugan Perumal",
    rationCard: "987654321234",
    mobile: "9876543210",
    cardType: "PHH",
    district: "Chengalpattu"
  },
  members: [
    { id: 1, name: "Murugan Perumal", relation: "Head", gender: "Male", age: 42, isHead: true },
    { id: 2, name: "Selvi Murugan", relation: "Wife", gender: "Female", age: 38 },
    { id: 3, name: "Karthik Murugan", relation: "Son", gender: "Male", age: 16 },
    { id: 4, name: "Priya Murugan", relation: "Daughter", gender: "Female", age: 12 },
  ],
  shop: { id: 4, name: "Chengalpattu Central Ration Shop", address: "Main Road, Chengalpattu", distance: "0.5 km", manager: "Karthik Raja", openTime: "9:00 AM", closeTime: "5:00 PM" },
  stock: [
    { id: 1, nameEn: "Rice (Boiled)", nameTa: "புழுங்கல் அரிசி", category: "Grain", unit: "kg", price: 0, available: 500, limit: 10, status: "Available", icon: "🌾" },
    { id: 2, nameEn: "Rice (Raw)", nameTa: "பச்சை அரிசி", category: "Grain", unit: "kg", price: 0, available: 400, limit: 10, status: "Available", icon: "🌾" },
    { id: 3, nameEn: "Wheat", nameTa: "கோதுமை", category: "Grain", unit: "kg", price: 0, available: 200, limit: 5, status: "Available", icon: "🌾" },
    { id: 4, nameEn: "Sugar", nameTa: "சர்க்கரை", category: "Sugar", unit: "kg", price: 25, available: 80, limit: 1, status: "Available", icon: "🍬" },
    { id: 5, nameEn: "Palm Oil", nameTa: "பாமாயில்", category: "Oil", unit: "litre", price: 25, available: 60, limit: 1, status: "Available", icon: "🫙" },
    { id: 6, nameEn: "Toor Dal", nameTa: "துவரம் பருப்பு", category: "Pulse", unit: "kg", price: 30, available: 30, limit: 2, status: "Available", icon: "🫘" },
    { id: 7, nameEn: "Kerosene", nameTa: "மண்ணெண்ணெய்", category: "Kerosene", unit: "litre", price: 11, available: 100, limit: 1, status: "Available", icon: "🛢️" },
  ],
  adminDash: { totalUsers: 0, totalShops: 0, tokensToday: 0, lowAlerts: 0, revenueMonth: 0 },
  notifications: [
    { id: 1, title: "Welcome!", titleTa: "வரவேற்கிறோம்!", msg: "Welcome to Smart Ration System.", time: "Just now", read: false, type: "System" },
  ],
};
