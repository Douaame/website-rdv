const noms_jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const aujourdhui = new Date();
const annee = aujourdhui.getFullYear();
const mois = aujourdhui.getMonth();

function genererGrille() {
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
    cell.textContent = jour;
    grille.appendChild(cell);
  }
}

genererGrille();