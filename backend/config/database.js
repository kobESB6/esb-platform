// config/database.js
// This file's ONLY job: define and export the database connection.
// Every model and route that needs the DB will import this one instance.

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create the connection instance using values from .env
const sequelize = new Sequelize(
  process.env.DB_NAME,      // which database: esb_db
  process.env.DB_USER,      // which user: kobieserious
  process.env.DB_PASSWORD,  // password (blank for now)
  {
    host: process.env.DB_HOST,   // localhost
    port: process.env.DB_PORT,   // 5432
    dialect: 'postgres',         // tells Sequelize we're using Postgres (not MySQL, etc.)
    logging: console.log,        // prints the SQL Sequelize generates — our teaching window
  }
);

module.exports = sequelize;