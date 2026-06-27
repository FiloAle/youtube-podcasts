import { Event, EventTarget } from "event-target-shim";

(globalThis as any).EventTarget = EventTarget;

class CustomEvent extends Event {
	detail: any;
	constructor(type: string, options?: { detail?: any }) {
		super(type);
		this.detail = options?.detail;
	}
}

(globalThis as any).CustomEvent = CustomEvent;
