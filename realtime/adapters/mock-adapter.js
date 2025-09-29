export function mockAdapter() {
    let messageHandler = () => {};
    const sentMessages = [];

    // listeners: Map<channel, Map<eventName, Set<callback>>>
    const listeners = new Map();

    return {
        /**
         * Simula la llegada de un evento
         * @param {string} type - Nombre del evento
         * @param {{applicationId: string|null, channel: string, payload: any}} eventObj - Evento con estructura
         */
        simulateIncoming(type, eventObj) {
            if (!eventObj || !('payload' in eventObj) || !('channel' in eventObj)) {
                throw new Error('Falta payload o channel en el evento simulado');
            }

            const { applicationId = null, channel, payload } = eventObj;

            // Ejecutar callback global si existe
            messageHandler(type, { applicationId, channel, payload });

            // Ejecutar callbacks específicos suscritos
            const channelListeners = listeners.get(channel);
            if (!channelListeners) return;

            const callbacks = channelListeners.get(type);
            if (!callbacks) return;

            for (const cb of callbacks) {
                try {
                    cb({ applicationId, channel, payload });
                } catch (err) {
                    console.error('Error en callback mockAdapter:', err);
                }
            }
        },

        onMessage(fn) {
            messageHandler = fn;
        },

        send(type, eventObj) {
            // eventObj esperado con {applicationId, channel, payload}
            sentMessages.push({ type, eventObj });
        },

        broadcast(type, eventObj) {
            this.send(type, eventObj);
        },

        getSentMessages() {
            return [...sentMessages];
        },

        reset() {
            sentMessages.length = 0;
            listeners.clear();
            messageHandler = () => {};
        },

        subscribe(type, callback, channelName) {
            if (!channelName) throw new Error('Debe especificar channelName para subscribe');

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

            callbacks.add(callback);
        },

        off(type, callback, channelName) {
            if (!channelName) throw new Error('Debe especificar channelName para off');

            const channelListeners = listeners.get(channelName);
            if (!channelListeners) return;

            const callbacks = channelListeners.get(type);
            if (!callbacks) return;

            if (callbacks.has(callback)) {
                callbacks.delete(callback);

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
