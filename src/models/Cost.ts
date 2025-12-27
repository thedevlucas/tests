import { DataTypes } from "sequelize";
import { database } from "../config/Database";

export const Cost = database.define(
  "cost",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    id_company: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: "company",
        key: "id",
      },
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("whatsapp", "sms", "call", "email", "agent"),
      allowNull: false,
    },
    id_user: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    id_debtor: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    cost_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "processed", "failed"),
      allowNull: true,
      defaultValue: "processed",
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: database,
    tableName: "cost",
  }
);
