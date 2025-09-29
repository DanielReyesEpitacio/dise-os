export function ablyAdapter(apiKey, channelNames = []) {
    const ably = new Ably.Realtime.Promise(apiKey);

    // Mapa: channelName -> Ably.Channel
    const channels = new Map();

    // Mapa para almacenar listeners:
    // channelName -> Map(eventName -> Set(callbacks))
    const listeners = new Map();

    let messageHandler = () => {};

    // Inicializar canales y suscribirse a todos los eventos recibidos en cada canal
    channelNames.forEach(name => {
        const ch = ably.channels.get(name);
        channels.set(name, ch);
        listeners.set(name, new Map());

        ch.subscribe(msg => {
            const data = msg.data || {};
            const applicationId = 'applicationId' in data ? data.applicationId : null;
            const payload = 'payload' in data ? data.payload : null;
            const emitterClientId = 'emitterClientId' in data ? data.emitterClientId : null;

            if (msg.name) {
                messageHandler(msg.name, {
                    applicationId,
                    channel: name,
                    payload,
                    emitterClientId
                });
            }
        });
    });

    return {
        onMessage(fn) {
            messageHandler = fn;
        },

        send(type, eventObj) {
            const targetChannel = eventObj.channel || channelNames[0];
            const ch = channels.get(targetChannel);
            if (!ch) throw new Error(`Channel ${targetChannel} no registrado en adapter`);

            ch.publish(type, eventObj);
        },

        broadcast(type, eventObj) {
            channelNames.forEach(name => {
                const ch = channels.get(name);
                if (ch) ch.publish(type, eventObj);
            });
        },

        subscribe(type, callback, channelName) {
            if (!channelName) throw new Error('Debe especificar channelName para subscribe');

            const ch = channels.get(channelName);
            if (!ch) throw new Error(`Channel ${channelName} no registrado en adapter`);

            let channelListeners = listeners.get(channelName);
            if (!channelListeners) {
                channelListeners = new Map();
                listeners.set(channelName, channelListeners);
            }

            let callbacks = channelListeners.get(type);
            if (!callbacks) {
                callbacks = new Set();
                channelListeners.set(type, callbacks);
            }

            // Evitar doble suscripción
            if (!callbacks.has(callback)) {
                callbacks.add(callback);
                ch.subscribe(type, callback);
            }
        },

        unsubscribe(type, callback, channelName) {
            if (!channelName) throw new Error('Debe especificar channelName para off');

            const ch = channels.get(channelName);
            if (!ch) throw new Error(`Channel ${channelName} no registrado en adapter`);

            const channelListeners = listeners.get(channelName);
            if (!channelListeners) return;

            const callbacks = channelListeners.get(type);
            if (!callbacks) return;

            if (callbacks.has(callback)) {
                callbacks.delete(callback);
                ch.unsubscribe(type, callback);

                // Limpieza si no quedan callbacks
                if (callbacks.size === 0) {
                    channelListeners.delete(type);
                }
                if (channelListeners.size === 0) {
                    listeners.delete(channelName);
                }
            }
        }
    };
}


// export function ablyAdapter(apiKey, channelNames = []) {
//     const ably = new Ably.Realtime.Promise(apiKey);
//
//     const channels = new Map();
//     // Map<channelName, Map<eventName, Set<callback>>>
//     const listeners = new Map();
//
//     let messageHandler = () => {};
//
//     channelNames.forEach(name => {
//         const ch = ably.channels.get(name);
//         channels.set(name, ch);
//         listeners.set(name, new Map());
//
//         ch.subscribe(msg => {
//             const data = msg.data || {};
//             const applicationId = 'applicationId' in data ? data.applicationId : null;
//             const payload = 'payload' in data ? data.payload : null;
//
//             if (msg.name) {
//                 messageHandler(msg.name, {
//                     applicationId,
//                     channel: name,
//                     payload,
//                 });
//             }
//         });
//     });
//
//     return {
//         onMessage(fn) {
//             messageHandler = fn;
//         },
//
//         send(type, eventObj) {
//             const targetChannel = eventObj.channel || channelNames[0];
//             const ch = channels.get(targetChannel);
//             if (!ch) throw new Error(`Channel ${targetChannel} no registrado en adapter`);
//
//             ch.publish(type, eventObj);
//         },
//
//         broadcast(type, eventObj) {
//             channelNames.forEach(name => {
//                 const ch = channels.get(name);
//                 if (ch) ch.publish(type, eventObj);
//             });
//         },
//
//         off(type, callback, channelName) {
//             // channelName es obligatorio para saber de qué canal desuscribir
//             if (!channelName) throw new Error('Debe especificar channelName para off');
//
//             const ch = channels.get(channelName);
//             if (!ch) throw new Error(`Channel ${channelName} no registrado en adapter`);
//
//             const channelListeners = listeners.get(channelName);
//             if (!channelListeners) return;
//
//             const callbacks = channelListeners.get(type);
//             if (!callbacks) return;
//
//             if (callbacks.has(callback)) {
//                 callbacks.delete(callback);
//                 ch.unsubscribe(type, callback);
//             }
//         },
//
//         // Para agregar listeners (opcional)
//         subscribe(type, callback, channelName) {
//             if (!channelName) throw new Error('Debe especificar channelName para subscribe');
//
//             const ch = channels.get(channelName);
//             if (!ch) throw new Error(`Channel ${channelName} no registrado en adapter`);
//
//             let channelListeners = listeners.get(channelName);
//             if (!channelListeners) {
//                 channelListeners = new Map();
//                 listeners.set(channelName, channelListeners);
//             }
//
//             let callbacks = channelListeners.get(type);
//             if (!callbacks) {
//                 callbacks = new Set();
//                 channelListeners.set(type, callbacks);
//             }
//
//             callbacks.add(callback);
//             ch.subscribe(type, callback);
//         }
//     };
// }


// export function ablyAdapter(apiKey, channelNames = []) {
//     const ably = new Ably.Realtime.Promise(apiKey);
//
//     const channels = new Map();
//
//     const listeners = new Map();
//
//     let messageHandler = () => {};
//
//     channelNames.forEach(name => {
//         const ch = ably.channels.get(name);
//         channels.set(name, ch);
//
//         ch.subscribe(msg => {
//             const data = msg.data || {};
//
//             const applicationId = 'applicationId' in data ? data.applicationId : null;
//             const payload = 'payload' in data ? data.payload : null;
//
//             if (msg.name) {
//                 messageHandler(msg.name, {
//                     applicationId,
//                     channel: name,
//                     payload,
//                 });
//             }
//         });
//     });
//
//     return {
//         onMessage(fn) {
//             messageHandler = fn;
//         },
//
//         send(type, eventObj) {
//             const targetChannel = eventObj.channel || channelNames[0]; // Si no especifica canal, usa el primero
//             const ch = channels.get(targetChannel);
//             if (!ch) throw new Error(`Channel ${targetChannel} no registrado en adapter`);
//
//             ch.publish(type, eventObj);
//         },
//
//         broadcast(type, eventObj) {
//             channelNames.forEach(name => {
//                 const ch = channels.get(name);
//                 if (ch) ch.publish(type, eventObj);
//             });
//         },
//
//         off(type, callback) {
//             if (!channelName) throw new Error('Debe especificar channelName para off');
//
//             const ch = channels.get(channelName);
//             if (!ch) throw new Error(`Channel ${channelName} no registrado en adapter`);
//
//             const channelListeners = listeners.get(channelName);
//             if (!channelListeners) return;
//
//             const callbacks = channelListeners.get(type);
//             if (!callbacks) return;
//
//             if (callbacks.has(callback)) {
//                 callbacks.delete(callback);
//                 ch.unsubscribe(type, callback);
//             }
//         }
//     };
// }

// export function ablyAdapter(apiKey, channelName = 'sm-channel') {
//     const ably = new Ably.Realtime.Promise(apiKey);
//     const channel = ably.channels.get(channelName);
//
//     let messageHandler = () => {};
//
//     // Map para almacenar callbacks para off()
//     const listeners = new Map();
//
//     // Suscribirse a todos los mensajes del canal
//     channel.subscribe(msg => {
//
//         const data = msg.data;
//
//         if (msg.name) {
//             const applicationId = data && 'applicationId' in data ? data.applicationId : null;
//             const payload = data && 'payload' in data ? data.payload : null;
//
//             messageHandler(msg.name, { applicationId, payload });
//         }
//
//         // msg.name es el tipo de evento
//         // msg.data es el payload
//         // if (msg.name) {
//         //     messageHandler(msg.name, msg.data);
//         // }
//     });
//
//     return {
//         onMessage(fn) {
//             messageHandler = fn;
//         },
//
//         send(type, payload) {
//             // Publicar evento con nombre y payload
//             channel.publish(type, payload);
//         },
//
//         broadcast(type, payload) {
//             // En Ably es igual que send
//             this.send(type, payload);
//         },
//
//         // Opcional: método para unsubscribir, si lo necesitas
//         off(type, callback) {
//             if (listeners.has(type)) {
//                 channel.unsubscribe(type, callback);
//                 listeners.delete(type);
//             }
//         }
//     };
// }
