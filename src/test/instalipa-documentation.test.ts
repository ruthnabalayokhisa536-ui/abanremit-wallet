import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Instalipa API Configuration Documentation", () => {
  const docPath = join(process.cwd(), "docs", "INSTALIPA_SETUP.md");
  let docContent: string;

  it("should have INSTALIPA_SETUP.md file", () => {
    expect(existsSync(docPath)).toBe(true);
  });

  it("should contain all required environment variables", () => {
    docContent = readFileSync(docPath, "utf-8");
    
    // Check for all three required environment variables
    expect(docContent).toContain("VITE_AIRTIME_API_URL");
    expect(docContent).toContain("VITE_AIRTIME_CONSUMER_KEY");
    expect(docContent).toContain("VITE_AIRTIME_CONSUMER_SECRET");
  });

  it("should include format specifications for VITE_AIRTIME_API_URL", () => {
    docContent = readFileSync(docPath, "utf-8");
    
    // Extract the section for this variable (from heading to next heading or end)
    const apiUrlSection = docContent.match(/### 1\. VITE_AIRTIME_API_URL[\s\S]*?(?=###|##|$)/i);
    expect(apiUrlSection).toBeTruthy();
    expect(apiUrlSection![0]).toMatch(/\*\*Format\*\*:/i);
    expect(apiUrlSection![0]).toMatch(/\*\*Example\*\*:/i);
  });

  it("should include format specifications for VITE_AIRTIME_CONSUMER_KEY", () => {
    docContent = readFileSync(docPath, "utf-8");
    
    // Extract the section for this variable
    const consumerKeySection = docContent.match(/### 2\. VITE_AIRTIME_CONSUMER_KEY[\s\S]*?(?=###|##|$)/i);
    expect(consumerKeySection).toBeTruthy();
    expect(consumerKeySection![0]).toMatch(/\*\*Format\*\*:/i);
    expect(consumerKeySection![0]).toMatch(/\*\*Example\*\*:/i);
  });

  it("should include format specifications for VITE_AIRTIME_CONSUMER_SECRET", () => {
    docContent = readFileSync(docPath, "utf-8");
    
    // Extract the section for this variable
    const consumerSecretSection = docContent.match(/### 3\. VITE_AIRTIME_CONSUMER_SECRET[\s\S]*?(?=###|##|$)/i);
    expect(consumerSecretSection).toBeTruthy();
    expect(consumerSecretSection![0]).toMatch(/\*\*Format\*\*:/i);
    expect(consumerSecretSection![0]).toMatch(/\*\*Example\*\*:/i);
  });

  it("should include instructions for obtaining credentials from Instalipa", () => {
    docContent = readFileSync(docPath, "utf-8");
    
    // Should have section about obtaining credentials
    expect(docContent).toMatch(/Obtaining Credentials/i);
    // Should mention Instalipa portal or support
    expect(docContent).toMatch(/Instalipa.*(?:Portal|Business|Support)/i);
  });

  it("should include troubleshooting section", () => {
    docContent = readFileSync(docPath, "utf-8");
    
    // Should have troubleshooting section
    expect(docContent).toMatch(/Troubleshooting/i);
  });

  it("should include example .env configuration", () => {
    docContent = readFileSync(docPath, "utf-8");
    
    // Should have .env example with all three variables
    expect(docContent).toMatch(/```env[\s\S]*?VITE_AIRTIME_API_URL[\s\S]*?```/);
    expect(docContent).toMatch(/```env[\s\S]*?VITE_AIRTIME_CONSUMER_KEY[\s\S]*?```/);
    expect(docContent).toMatch(/```env[\s\S]*?VITE_AIRTIME_CONSUMER_SECRET[\s\S]*?```/);
  });

  it("should include common error scenarios in troubleshooting", () => {
    docContent = readFileSync(docPath, "utf-8");
    
    // Should mention common errors
    expect(docContent).toMatch(/credentials not configured/i);
    expect(docContent).toMatch(/401|unauthorized/i);
  });

  it("should include security warnings for credentials", () => {
    docContent = readFileSync(docPath, "utf-8");
    
    // Should mention security or keeping secrets secure
    expect(docContent).toMatch(/security|secure|secret/i);
    // Should warn about version control
    expect(docContent).toMatch(/never commit|version control|\.gitignore/i);
  });
});
