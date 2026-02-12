// Hardcoded test accounts for development
// Admin can delete these once system goes live

export interface TestAccount {
  phone: string;
  name: string;
  password: string;
  role: "user" | "agent" | "admin";
  walletId: string;
  balance: number;
  kycStatus: "pending" | "approved" | "rejected";
  email?: string;
  agentId?: string;
  commissionBalance?: number;
}

export const TEST_ACCOUNTS: TestAccount[] = [
  {
    phone: "0111679286",
    name: "Laban Panda Khisa",
    password: "1234567",
    role: "admin",
    walletId: "ADM-0001",
    balance: 4250000,
    kycStatus: "approved",
    email: "admin@abanremit.com",
  },
  {
    phone: "0717562660",
    name: "Purity Musembi",
    password: "1234567",
    role: "user",
    walletId: "7770001",
    balance: 15300,
    kycStatus: "approved",
    email: "purity@example.com",
  },
  {
    phone: "0793923427",
    name: "Ethan Khisa",
    password: "1234567",
    role: "agent",
    walletId: "8880001",
    balance: 245800,
    kycStatus: "approved",
    email: "ethan@example.com",
    agentId: "AGT-0042",
    commissionBalance: 12450,
  },
];

export function authenticateUser(phone: string, password: string): TestAccount | null {
  const normalized = phone.replace(/\s+/g, "").replace(/^\+254/, "0");
  return TEST_ACCOUNTS.find(
    (a) => a.phone === normalized && a.password === password
  ) || null;
}

export function getLoggedInUser(): TestAccount | null {
  const stored = sessionStorage.getItem("abanremit_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as TestAccount;
  } catch {
    return null;
  }
}

export function setLoggedInUser(user: TestAccount) {
  sessionStorage.setItem("abanremit_user", JSON.stringify(user));
}

export function logoutUser() {
  sessionStorage.removeItem("abanremit_user");
}
