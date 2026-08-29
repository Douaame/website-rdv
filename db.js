const Database = require('better-sqlite3');

const db = new Database('rdv.sqlite');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;

db.exec(`
  CREATE TABLE IF NOT EXISTS secretaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS medecins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone_fixe TEXT,
    telephone_mobile TEXT,
    email TEXT,
    specialite TEXT,
    bio TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    telephone TEXT NOT NULL,
    email TEXT,
    adresse TEXT,
    password_hash TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rdv (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    medecin_id INTEGER NOT NULL REFERENCES medecins(id),
    secretaire_id INTEGER NOT NULL REFERENCES secretaires(id),
    date_heure TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'confirme',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  
  CREATE TABLE IF NOT EXISTS conges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medecin_id INTEGER NOT NULL REFERENCES medecins(id),
    date_debut TEXT NOT NULL,
    date_fin TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS avis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    medecin_id INTEGER NOT NULL REFERENCES medecins(id),
    note INTEGER NOT NULL,
    commentaire TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

`);