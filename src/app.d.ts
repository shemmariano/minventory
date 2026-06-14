declare global {
	namespace App {
		interface Locals {
			user: { id: string; username: string } | null;
		}
	}
}

export {};