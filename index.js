const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const PORT = 3000;

function requireSecretaire(req, res, next) {
  if (!req.session.secretaireId) {
    return res.status(401).json({ error: 'Connexion requise (secretaire)' });
  }
  next();
}

function requirePatient(req, res, next) {
  if (!req.session.patientId) {
    return res.status(401).json({ error: 'Connexion requise (patient)' });
  }
  next();
}

app.use(express.json());

app.use(session({
  secret: 'change-moi-plus-tard',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Serveur en ligne' });
});

app.post('/api/patients', (req, res) => {
  const { nom, prenom, telephone, email, adresse } = req.body;

  if (!nom || !prenom || !telephone) {
    return res.status(400).json({ error: 'nom, prenom et telephone sont obligatoires' });
  }

  const stmt = db.prepare(`
    INSERT INTO patients (nom, prenom, telephone, email, adresse)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(nom, prenom, telephone, email || null, adresse || null);

  res.status(201).json({ id: result.lastInsertRowid, nom, prenom, telephone, email, adresse });
});

app.post('/api/medecins', (req, res) => {
  const { nom, prenom, specialite, telephone_fixe, telephone_mobile, email } = req.body;

  if (!nom || !prenom || !specialite || !telephone_fixe) {
    return res.status(400).json({ error: 'nom, prenom, specialite et telephone fixe sont obligatoires' });
  }
  const stmt = db.prepare(`
   INSERT INTO medecins (nom, prenom, specialite, telephone_fixe, telephone_mobile, email)
   VALUES (?, ?, ?, ?, ?, ?)
   `);
  const result = stmt.run(nom, prenom, specialite, telephone_fixe, telephone_mobile || null, email || null);

  res.status(201).json({ id: result.lastInsertRowid, nom, prenom, specialite, telephone_fixe, telephone_mobile, email });

});

app.post('/api/secretaires', async (req, res) => {
  const { nom, prenom, telephone, email, password } = req.body;

  if (!nom || !prenom || !telephone || !password) {
    return res.status(400).json({ error: 'nom, prenom, telephone et mot de passe sont obligatoires' });
  }

  const hash = await bcrypt.hash(password, 10);

  const stmt = db.prepare(`
    INSERT INTO secretaires (nom, prenom, telephone, email, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(nom, prenom, telephone, email || null, hash);

  res.status(201).json({ id: result.lastInsertRowid, nom, prenom, telephone, email });
});

app.post('/api/secretaires/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email et mot de passe sont obligatoires' });
  }

  const stmt = db.prepare(`
    SELECT* FROM secretaires WHERE 
    email = ?
  `);
  const secretaire = stmt.get(email);
  if (!secretaire) {
    return res.status(400).json({ error: 'Utilisateur non trouvé' });
  } else {
    bcrypt.compare(password, secretaire.password_hash);
    const isMatch = await bcrypt.compare(password, secretaire.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Utilisateur non trouvé' });
    } else {
      req.session.secretaireId = secretaire.id;
      req.session.secretaireNom = secretaire.nom;
      res.status(200).json({ 'Connexion reussie': true, 'id': secretaire.id, 'nom': secretaire.nom, 'prenom': secretaire.prenom, 'telephone': secretaire.telephone, 'email': secretaire.email });
    }
  }
});

app.post('/api/rdv', requireSecretaire, (req, res) => {
  let { patient_id, medecin_id, secretaire_id, date_heure } = req.body;
  const { nom, prenom, telephone } = req.body;

  if (!medecin_id || !secretaire_id || !date_heure) {
    return res.status(400).json({ error: 'medecin_id, secretaire_id et date_heure sont obligatoires' });
  }
  if (!patient_id && (!nom || !prenom || !telephone)) {
    return res.status(400).json({ error: 'patient_id ou (nom, prenom et telephone) sont obligatoires' });
  }

  if (!patient_id) {
    const stmt1 = db.prepare(`
    SELECT * FROM patients WHERE telephone = ?
  `);
    const patient = stmt1.get(telephone);
    if (patient) {
      patient_id = patient.id;
    } else {
      const stmt2 = db.prepare(`
      INSERT INTO patients (nom, prenom, telephone)
      VALUES (?, ?, ?)
    `);
      const result1 = stmt2.run(nom, prenom, telephone);
      patient_id = result1.lastInsertRowid;
    }
  }
  const stmt3 = db.prepare(`
    SELECT * FROM conges WHERE medecin_id = ? AND ? BETWEEN date_debut AND date_fin
  `);
  const conge = stmt3.get(medecin_id, date_heure);
  if (conge) {
    return res.status(400).json({ error: 'Le médecin est en congé à cette date' });
  }

  const stmt4 = db.prepare(`
    SELECT * FROM rdv WHERE medecin_id = ? AND date_heure = ? AND statut != 'annule'
  `);
  const rdv = stmt4.get(medecin_id, date_heure);
  if (rdv) {
    return res.status(400).json({ error: 'Le médecin a déjà un rendez-vous à cette date et heure' });
  }

  const stmt5 = db.prepare(`
    INSERT INTO rdv (patient_id, medecin_id, secretaire_id, date_heure)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt5.run(patient_id, medecin_id, secretaire_id, date_heure);

  res.status(201).json({ id: result.lastInsertRowid, patient_id, medecin_id, secretaire_id, date_heure });
});

app.post('/api/patients/signup', async (req, res) => {
  const { nom, prenom, telephone, email, adresse, password } = req.body;
  if (!nom || !prenom || !telephone || !password) {
    return res.status(400).json({ error: 'nom, prenom, telephone et mot de passe sont obligatoires' });
  }

  const stmt1 = db.prepare(`
    SELECT * FROM patients WHERE email = ? OR telephone = ? 
  `);

  const existant = stmt1.get(email || null, telephone);
  if (existant && existant.password_hash) {
    return res.status(400).json({ error: 'Un patient avec cet email ou ce numéro de téléphone existe déjà' });
  } else if (existant && !existant.password_hash) {
    const hash = await bcrypt.hash(password, 10);
    const stmt3 = db.prepare(`
      UPDATE patients SET password_hash = ? WHERE email = ? OR telephone = ?
    `);
    stmt3.run(hash, email, telephone);
    return res.status(200).json({ message: 'Mot de passe mis à jour avec succès' });
  } else {
    const hash = await bcrypt.hash(password, 10);
    const stmt4 = db.prepare(`
      INSERT INTO patients (nom, prenom, telephone, email, adresse, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt4.run(nom, prenom, telephone, email || null, adresse || null, hash);
    return res.status(201).json({ id: result.lastInsertRowid, nom, prenom, telephone, email, adresse });
  }
});

app.post('/api/patients/login', async (req, res) => {
  const { email, telephone, password } = req.body;
  if ((!email && !telephone) || !password) {
    return res.status(400).json({ error: 'email ou telephone et mot de passe sont obligatoires' });
  }

  const stmt = db.prepare(`
    SELECT * FROM patients WHERE email = ? OR telephone = ?
  `);
  const patient = stmt.get(email || null, telephone || null);
  if (!patient || !patient.password_hash) {
    return res.status(400).json({ error: 'Identifiants incorrects' });
  }
  const isMatch = await bcrypt.compare(password, patient.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Identifiants incorrects' });
  }
  req.session.patientId = patient.id;
  req.session.patientNom = patient.nom;
  res.status(200).json({ message: 'Connexion réussie', patient_id: patient.id });
});

app.post('/api/avis', requirePatient, (req, res) => {
  const { patient_id, medecin_id, note, commentaire } = req.body;
  if (!patient_id || !medecin_id || !note) {
    return res.status(400).json({ error: 'patient_id, medecin_id et note sont obligatoires' });
  }
  if (note < 1 || note > 5) {
    return res.status(400).json({ error: 'La note doit être comprise entre 1 et 5' });
  }

  const stmt = db.prepare(`
    INSERT INTO avis (patient_id, medecin_id, note, commentaire)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(patient_id, medecin_id, note, commentaire || null);
  res.status(201).json({ message: 'Avis ajouté avec succès', avis_id: result.lastInsertRowid });
});

app.put('/api/medecins/:id/bio', requireSecretaire, (req, res) => {
  const { id } = req.params;
  const { bio } = req.body;

  if (!bio) {
    return res.status(400).json({ error: 'Le champ bio est obligatoire' });
  }
  const stmt = db.prepare(`
    UPDATE medecins SET bio = ? WHERE id = ?
  `);
  const result = stmt.run(bio, id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Médecin non trouvé' });
  }
  res.status(200).json({ message: 'Bio mise à jour avec succès' });
});

app.get('/api/whoami', (req, res) => {
  if (req.session.secretaireId) {
    res.status(200).json({ role: 'secretaire', id: req.session.secretaireId, nom: req.session.secretaireNom });
  } else if (req.session.patientId) {
    res.status(200).json({ role: 'patient', id: req.session.patientId, nom: req.session.patientNom });
  } else {
    res.status(401).json({ error: 'Pas Connecté' });
  }
});
app.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
})
