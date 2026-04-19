import { describe, it, expect } from "vitest";
import { validateNip, calculatePasswordStrength, validateEmail } from "../validation";

describe("Celtronics V12 Validation Engine", () => {
  
  describe("NIP Validation", () => {
    it("should validate a correct NIP (e.g., 5260250995)", () => {
      expect(validateNip("5260250995")).toBe(true);
    });

    it("should reject an incorrect NIP checksum", () => {
      expect(validateNip("5260250990")).toBe(false);
    });

    it("should reject NIP with invalid length", () => {
      expect(validateNip("123")).toBe(false);
      expect(validateNip("12345678901")).toBe(false);
    });

    it("should ignore non-digit characters", () => {
      expect(validateNip("526-025-09-95")).toBe(true);
    });
  });

  describe("Password Strength", () => {
    it("should return 0 for empty or very short simple password", () => {
      expect(calculatePasswordStrength("abc")).toBe(0);
    });

    it("should return 1 for length >= 8", () => {
      expect(calculatePasswordStrength("abcdefgh")).toBe(1);
    });

    it("should return 4 for complex password (V12 Standard)", () => {
      expect(calculatePasswordStrength("P@ssw0rd123!")).toBe(4);
    });
  });

  describe("Email Validation", () => {
    it("should validate correct emails", () => {
      expect(validateEmail("test@celtronics.pl")).toBe(true);
      expect(validateEmail("user.name+label@gmail.com")).toBe(true);
    });

    it("should reject malformed emails", () => {
      expect(validateEmail("plainstring")).toBe(false);
      expect(validateEmail("missing@tld")).toBe(false);
    });
  });
});
