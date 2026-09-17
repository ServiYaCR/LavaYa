// コスタリカ 7州とその郡（カントン）
// 注: Río Cuarto (Alajuela)、Monteverde・Puerto Jiménez (Puntarenas) は
// 近年新設された郡です。本番リリース前にTSE/INECの最新公式リストと突合してください。
const CR_LOCATIONS = {
  "San José": ["San José","Escazú","Desamparados","Puriscal","Tarrazú","Aserrí","Mora","Goicoechea","Santa Ana","Alajuelita","Vázquez de Coronado","Acosta","Tibás","Moravia","Montes de Oca","Turrubares","Dota","Curridabat","Pérez Zeledón","León Cortés"],
  "Alajuela": ["Alajuela","San Ramón","Grecia","San Mateo","Atenas","Naranjo","Palmares","Poás","Orotina","San Carlos","Zarcero","Sarchí (Valverde Vega)","Upala","Los Chiles","Guatuso","Río Cuarto"],
  "Cartago": ["Cartago","Paraíso","La Unión","Jiménez","Turrialba","Alvarado","Oreamuno","El Guarco"],
  "Heredia": ["Heredia","Barva","Santo Domingo","Santa Bárbara","San Rafael","San Isidro","Belén","Flores","San Pablo","Sarapiquí"],
  "Guanacaste": ["Liberia","Nicoya","Santa Cruz","Bagaces","Carrillo","Cañas","Abangares","Tilarán","Nandayure","La Cruz","Hojancha"],
  "Puntarenas": ["Puntarenas","Esparza","Buenos Aires","Montes de Oro","Osa","Aguirre (Quepos)","Golfito","Coto Brus","Parrita","Corredores","Garabito","Monteverde","Puerto Jiménez"],
  "Limón": ["Limón","Pococí","Siquirres","Talamanca","Matina","Guácimo"]
};

// ⚠ Modo piloto: ServiYa solo opera en Rohrmoser/Sabana (cantón San José,
// provincia San José) por ahora. En lugar de mostrar los 7 provincias y
// 82 cantones completos (que solo confunden, ya que el pin GPS igual
// bloquea el registro fuera de zona), limitamos el menú desplegable a la
// única opción real disponible. Cuando ServiYa se expanda a otras zonas,
// cambiar PILOT_MODE a false para volver a usar la lista completa de arriba.
const PILOT_MODE = true;
const PILOT_LOCATIONS = { "San José": ["San José"] };

function populateProvinceCantonSelects(provinceSelectId, cantonSelectId) {
  const provinceSelect = document.getElementById(provinceSelectId);
  const cantonSelect = document.getElementById(cantonSelectId);
  const locations = PILOT_MODE ? PILOT_LOCATIONS : CR_LOCATIONS;

  provinceSelect.innerHTML = '<option value="">Selecciona una provincia</option>' +
    Object.keys(locations).map(p => `<option value="${p}">${p}</option>`).join('');

  provinceSelect.addEventListener('change', () => {
    const cantones = locations[provinceSelect.value] || [];
    cantonSelect.innerHTML = '<option value="">Selecciona un cantón</option>' +
      cantones.map(c => `<option value="${c}">${c}</option>`).join('');
  });

  // Modo piloto: con una sola opción disponible, la seleccionamos
  // automáticamente para ahorrarle un clic al usuario.
  if (PILOT_MODE) {
    const onlyProvince = Object.keys(locations)[0];
    provinceSelect.value = onlyProvince;
    provinceSelect.dispatchEvent(new Event('change'));
    cantonSelect.value = locations[onlyProvince][0];
  }
}
