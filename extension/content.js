const handlers = {
    'connected': () => {
        console.log('Connected to server');
    },
    'create_entity': (id) => {
        console.log('Creating entity:', id);
    },
    'set_position': (id, position) => {
        console.log('Setting position of entity:', id, 'to:', position);
    },
    'create_component': (id, name, type) => {
        console.log('Creating component:', name, 'of type:', type, 'on entity:', id);
    },
    'set_render_component_material': (id, materialId) => {
        console.log('Setting material:', materialId, 'on render component:', id);
    },
    'create_material': (name) => {
        console.log('Creating material:', name);
    },
    'set_material_color': (id, color) => {
        console.log('Setting color:', color, 'on material:', id);
    }
};

const ws = new WebSocket('ws://localhost:52000');
ws.onmessage = (event) => {
    try {
        const { name, args } = JSON.parse(event.data);
        const res = handlers[name]?.(...args);
        ws.send(JSON.stringify({ res }));
    } catch (e) {
        console.error('[content.js] Error:', e);
    }
};
