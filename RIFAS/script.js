import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNKyAPVQYUrCkT8q0uMNvCSbqhoFt2Lig",
  authDomain: "rifas-mundo-premios-llc.firebaseapp.com",
  databaseURL: "https://rifas-mundo-premios-llc-default-rtdb.firebaseio.com",
  projectId: "rifas-mundo-premios-llc",
  storageBucket: "rifas-mundo-premios-llc.firebasestorage.app",
  messagingSenderId: "737313631488",
  appId: "1:737313631488:web:2bd56be168e590c18e17e5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.seleccionados = [];
window.tasaDolar = 40.00;
window.precioUnitarioUSD = 5.00;

window.mostrarSeccion = function(id) {
    document.querySelectorAll('.seccion-activa').forEach(s => s.classList.add('d-none'));
    const section = document.getElementById(id);
    if (section) section.classList.remove('d-none');
    window.scrollTo(0,0);
};

window.ajustarTickets = function(cambio) {
    let input = document.getElementById('cantidad-tickets');
    let valor = parseInt(input.value) + cambio;
    if (valor >= 1) {
        input.value = valor;
        actualizarPrecios();
    }
};

function actualizarPrecios() {
    let cantidad = parseInt(document.getElementById('cantidad-tickets').value) || 0;
    let totalUSD = cantidad * window.precioUnitarioUSD;
    let totalBS = totalUSD * window.tasaDolar;
    document.getElementById('precio-usd').innerText = "$" + totalUSD.toFixed(2);
    document.getElementById('precio-bs').innerText = totalBS.toFixed(2) + " Bs.";
}

window.setModo = function(modo) {
    document.getElementById('modo-auto').classList.toggle('d-none', modo === 'manual');
    document.getElementById('modo-manual').classList.toggle('d-none', modo === 'auto');
};

window.generarAlAzar = function() {
    let cantidad = parseInt(document.getElementById('cantidad-tickets').value);
    window.seleccionados = [];
    let display = document.getElementById('lista-azar');
    display.innerHTML = "";
    for (let i = 0; i < cantidad; i++) {
        let num = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        if (!window.seleccionados.includes(num)) {
            window.seleccionados.push(num);
            display.innerHTML += `<span class="badge bg-info p-2 m-1" style="font-size:1.1rem;">${num}</span>`;
        } else { i--; }
    }
    document.getElementById('tickets-generados').classList.remove('d-none');
    actualizarPrecios();
};

window.agregarManual = function() {
    let input = document.getElementById('input-manual').value;
    let lista = input.split(',').map(n => n.trim().padStart(4, '0'));
    window.seleccionados = lista.filter(n => n.length === 4 && !isNaN(n));
    if (window.seleccionados.length < 1) return alert("Ingresa números de 4 cifras.");
    
    let display = document.getElementById('lista-azar');
    display.innerHTML = "";
    window.seleccionados.forEach(num => {
        display.innerHTML += `<span class="badge bg-info p-2 m-1" style="font-size:1.1rem;">${num}</span>`;
    });
    document.getElementById('cantidad-tickets').value = window.seleccionados.length;
    actualizarPrecios();
    document.getElementById('tickets-generados').classList.remove('d-none');
};

// --- FUNCIÓN REGISTRAR VENTA ACTUALIZADA CON FORMATO DE TICKET Y WHATSAPP ---
window.registrarVenta = async function() {
    const nombre = document.getElementById('nombre-cliente').value;
    const cedula = document.getElementById('cedula-cliente').value;
    const tel = document.getElementById('tel-cliente').value;
    const refPago = document.getElementById('referencia-pago').value; 

    if (!nombre || !cedula || !tel || !refPago) {
        return alert("Por favor, completa todos los campos obligatorios.");
    }

    try {
        const idVenta = Date.now();
        const numerosComprados = window.seleccionados.join(" - ");
        
        // 1. Guardar en Firebase
        await set(ref(db, 'ventas/' + cedula + '/' + idVenta), {
            nombre: nombre,
            numeros: window.seleccionados,
            telefono: tel,
            referencia: refPago,
            fecha: new Date().toLocaleString(),
            estatus: "Pendiente"
        });

        // 2. Mensaje ultra-detallado para WhatsApp
        const mensaje = `*🎫 COMPRA REALIZADA - RIFAS MUNDO PREMIOS*%0A` +
                        `------------------------------------------%0A` +
                        `*👤 Cliente:* ${nombre.trim()}%0A` +
                        `*🆔 Cédula:* ${cedula}%0A` +
                        `*🎟️ Mis Tickets:* [ ${numerosComprados} ]%0A` +
                        `*🔢 Referencia:* ${refPago}%0A` +
                        `------------------------------------------%0A` +
                        `_Adjunto mi comprobante de pago para la validación._`;

        const urlWhatsapp = `https://api.whatsapp.com/send?phone=584128700963&text=${mensaje}`;
        
        // 3. Aviso visual profesional
        alert("¡Registro Exitoso! \n\nSus números son: " + numerosComprados + "\n\nAl presionar Aceptar, se abrirá WhatsApp. Solo debes darle a 'Enviar' para validar tus tickets.");
        
        // 4. Redirección directa
        window.location.href = urlWhatsapp;

    } catch (e) {
        console.error("Error:", e);
        alert("Hubo un problema con el registro. Intenta de nuevo.");
    }
};

window.buscarPorCedula = async function() {
    const cedula = document.getElementById('input-busqueda-cedula').value;
    const res = document.getElementById('resultado-busqueda');
    if (!cedula) return alert("Ingresa tu cédula.");

    try {
        const snapshot = await get(child(ref(db), `ventas/${cedula}`));
        if (snapshot.exists()) {
            let html = '<div class="alert alert-success">';
            const datos = snapshot.val();
            for (let key in datos) {
                html += `<p class="mb-1">🎟️ <b>${datos[key].numeros.join(", ")}</b></p><small>${datos[key].fecha}</small><hr>`;
            }
            res.innerHTML = html + "</div>";
        } else { res.innerHTML = "No se encontraron registros."; }
    } catch (e) { res.innerHTML = "Error al buscar."; }
};

window.cargarVentasAdmin = async function() {
    const res = document.getElementById('lista-top');
    if(!res) return;
    res.innerHTML = "<p class='text-center'>Cargando ventas...</p>";
    
    try {
        const snapshot = await get(ref(db, 'ventas'));
        if (snapshot.exists()) {
            let html = '<div class="table-responsive"><table class="table table-sm table-striped">';
            html += '<thead><tr><th>Cédula</th><th>Nombre</th><th>Referencia</th><th>Números</th></tr></thead><tbody>';
            
            const todasLasVentas = snapshot.val();
            for (let cedula in todasLasVentas) {
                const ventasDeCliente = todasLasVentas[cedula];
                for (let idVenta in ventasDeCliente) {
                    const v = ventasDeCliente[idVenta];
                    html += `<tr>
                        <td>${cedula}</td>
                        <td>${v.nombre}</td>
                        <td>${v.referencia || 'N/A'}</td>
                        <td><span class="badge bg-primary">${v.numeros.join(", ")}</span></td>
                    </tr>`;
                }
            }
            html += '</tbody></table></div>';
            res.innerHTML = html;
        } else {
            res.innerHTML = "<p class='text-center'>Aún no hay ventas registradas.</p>";
        }
    } catch (e) {
        res.innerHTML = "Error al cargar datos.";
    }
};

const originalMostrarSeccion = window.mostrarSeccion;
window.mostrarSeccion = function(id) {
    originalMostrarSeccion(id);
    if (id === 'top') {
        window.cargarVentasAdmin();
    }
};

actualizarPrecios();