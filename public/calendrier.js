const noms_jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const aujourdhui = new Date();
let annee = aujourdhui.getFullYear();
let mois = aujourdhui.getMonth();

async function chargerRdvs() {
  const response = await fetch('/api/rdv');
  const rdvs = await response.json();
  return rdvs;
}

async function genererGrille() {
  const rdvs = await chargerRdvs();

  const grille = document.getElementById('calendrier-grille');
  grille.innerHTML = '';

  const nomsMois = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
  document.getElementById('mois-titre').textContent = `${nomsMois[mois]} ${annee}`;

  const premierJour = new Date(annee, mois, 1).getDay();
  const nbJours = new Date(annee, mois + 1, 0).getDate();

  noms_jours.forEach(nom => {
    const cell = document.createElement('div');
    cell.className = 'jour-entete';
    cell.textContent = nom;
    grille.appendChild(cell);
  });

  for (let i = 0; i < premierJour; i++) {
    const cell = document.createElement('div');
    cell.className = 'case-vide';
    grille.appendChild(cell);
  }

  for (let jour = 1; jour <= nbJours; jour++) {
    const cell = document.createElement('div');
    cell.className = 'case-jour';

    const numero = document.createElement('div');
    numero.textContent = jour;
    cell.appendChild(numero);

    const dateCase = `${annee}-${String(mois + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
    const rdvsDuJour = rdvs.filter(r => r.date_heure.startsWith(dateCase));

  rdvsDuJour.forEach(rdv => {
  const item = document.createElement('div');
  item.className = 'rdv-item';
  item.textContent = `${rdv.patient_prenom} ${rdv.patient_nom} - Dr ${rdv.medecin_nom}`;

  item.addEventListener('mouseenter', (e) => afficherPopover(e, rdv));
  item.addEventListener('mouseleave', cacherPopover);

  cell.appendChild(item);
});
let dateSelectionnee = null;

cell.addEventListener('click', () => {
  dateSelectionnee = dateCase;
  document.getElementById('modal-date').textContent = dateSelectionnee;
  document.getElementById('modal-rdv').style.display = 'flex';
  chargerMedecinsDansSelect();   // <- ajoute cette ligne
});
    grille.appendChild(cell);
  }
}

document.getElementById('modal-annuler').addEventListener('click', () => {
  document.getElementById('modal-rdv').style.display = 'none';
});

function afficherPopover(event, rdv) {
  const popover = document.getElementById('popover');
  popover.innerHTML = `
    <strong>${rdv.patient_prenom} ${rdv.patient_nom}</strong><br>
    Tel: ${rdv.patient_telephone}<br>
    Medecin: Dr ${rdv.medecin_nom} (${rdv.medecin_specialite})<br>
    Heure: ${rdv.date_heure}<br>
    Statut: ${rdv.statut}
  `;
  popover.style.left = event.pageX + 10 + 'px';
  popover.style.top = event.pageY + 10 + 'px';
  popover.style.display = 'block';
}

function cacherPopover() {
  document.getElementById('popover').style.display = 'none';
}

genererGrille();

document.getElementById('mois-precedent').addEventListener('click', () => {
  mois--;
  if (mois < 0) {
    mois = 11;
    annee--;
  }
  genererGrille();
});

document.getElementById('mois-suivant').addEventListener('click', () => {
  mois++;
  if (mois > 11) {
    mois = 0;
    annee++;
  }
  genererGrille();
});

async function chargerMedecinsDansSelect() {
  const response = await fetch('/api/medecins');
  const medecins = await response.json();
  const select = document.getElementById('rdv-medecin');
  select.innerHTML = '';

  const optionVide = document.createElement('option');
  optionVide.value = '';
  optionVide.textContent = '--';
  optionVide.disabled = true;
  optionVide.selected = true;
  select.appendChild(optionVide);

  medecins.forEach(m => {
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = `Dr ${m.nom} ${m.prenom} (${m.specialite})`;
    select.appendChild(option);
  });
}

document.getElementById('form-rdv').addEventListener('submit', async (e) => {
  e.preventDefault();

  const heure = document.getElementById('rdv-heure').value;
  const medecin_id = document.getElementById('rdv-medecin').value;
  const nom = document.getElementById('rdv-nom').value;
  const prenom = document.getElementById('rdv-prenom').value;
  const telephone = document.getElementById('rdv-telephone').value;

  const date_heure = `${dateSelectionnee} ${heure}`;

  const response = await fetch('/api/rdv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medecin_id, nom, prenom, telephone, date_heure })
  });
  const data = await response.json();

  if (response.ok) {
    document.getElementById('modal-rdv').style.display = 'none';
    genererGrille(); // recharge le calendrier pour voir le nouveau RDV
  } else {
    alert(data.error);
  }
});