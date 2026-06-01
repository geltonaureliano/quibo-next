export * from "@/generated/prisma/enums"
export type * from "@/generated/prisma/models"

import type {
  AccountModel,
  PersonaModel,
  CategoryModel,
  SalaryModel,
  LivingCostModel,
  DebtModel,
  DebtInstallmentModel,
  CreditCardModel,
  InvoiceModel,
  TransactionModel,
  MonthlyPaymentRecordModel,
  UserModel,
} from "@/generated/prisma/models"

export type Account = AccountModel
export type Persona = PersonaModel
export type Category = CategoryModel
export type Salary = SalaryModel
export type LivingCost = LivingCostModel
export type Debt = DebtModel
export type DebtInstallment = DebtInstallmentModel
export type CreditCard = CreditCardModel
export type Invoice = InvoiceModel
export type Transaction = TransactionModel
export type MonthlyPaymentRecord = MonthlyPaymentRecordModel
export type User = UserModel
