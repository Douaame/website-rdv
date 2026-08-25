const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

app.use(express.json());

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

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email et mot de passe sont obligatoires'});
  }

  const stmt = db.prepare(`
    SELECT* FROM secretaires WHERE 
    email = ?
  `);
  const secretaire = stmt.get(email);
  if (!secretaire) {
    return res.status(400).json({ error: 'Utilisateur non trouvé'});
  }else{
  bcrypt.compare(password, secretaire.password_hash);
  const isMatch = await bcrypt.compare(password, secretaire.password_hash);
   if (!isMatch){
    return res.status(400).json({ error: 'Utilisateur non trouvé'});
   }else{
   res.status (200).json({'Connexion reussie': true, 'id': secretaire.id, 'nom': secretaire.nom, 'prenom': secretaire.prenom, 'telephone': secretaire.telephone, 'email': secretaire.email});
   }
  }
});

app.post('/api/rdv', (req, res) => {
  const { patient_id, medecin_id, secretaire_id, date_heure } = req.body;
  if (!patient_id || !medecin_id || !secretaire_id || !date_heure) {
    return res.status(400).json({ error: 'patient_id, medecin_id, secretaire_id et date_heure sont obligatoires' });
  }
  const stmt = db.prepare(`
    SELECT * FROM conges WHERE medecin_id = ? AND ? BETWEEN date_debut AND date_fin
  `);
  const conge = stmt.get(medecin_id, date_heure);
  if (conge) {
    return res.status(400).json({ error: 'Le médecin est en congé à cette date' });
  }

  const stmt2 = db.prepare(`
    SELECT * FROM rdv WHERE medecin_id = ? AND date_heure = ? AND statut != 'annule'
  `);
  const rdv = stmt2.get(medecin_id, date_heure);
  if (rdv) {
    return res.status(400).json({ error: 'Le médecin a déjà un rendez-vous à cette date et heure' });
  }

  const stmt3 = db.prepare(`
    INSERT INTO rdv (patient_id, medecin_id, secretaire_id, date_heure)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt3.run(patient_id, medecin_id, secretaire_id, date_heure);

  res.status(201).json({ id: result.lastInsertRowid, patient_id, medecin_id, secretaire_id, date_heure });

}); 

app.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
})
