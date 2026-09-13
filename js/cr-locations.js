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

function populateProvinceCantonSelects(provinceSelectId, cantonSelectId) {
  const provinceSelect = document.getElementById(provinceSelectId);
  const cantonSelect = document.getElementById(cantonSelectId);

  provinceSelect.innerHTML = '<option value="">Selecciona una provincia</option>' +
    Object.keys(CR_LOCATIONS).map(p => `<option value="${p}">${p}</option>`).join('');

  provinceSelect.addEventListener('change', () => {
    const cantones = CR_LOCATIONS[provinceSelect.value] || [];
    cantonSelect.innerHTML = '<option value="">Selecciona un cantón</option>' +
      cantones.map(c => `<option value="${c}">${c}</option>`).join('');
  });
}
