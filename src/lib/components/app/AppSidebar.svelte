<script lang="ts">
	import { Root, Header, Content, Group, Footer, Menu, MenuItem, MenuButton } from '../ui/sidebar';
	import { Dialog, DialogContent, DialogFooter } from '../ui/dialog';
	import { LogOut } from '@lucide/svelte';
	import { Button } from '../ui/button';
	import { goto } from '$app/navigation';
	import { Spinner } from '../ui/spinner';
	import LogoBrand from './LogoBrand.svelte';

	let openLogOutModal = $state(false);
	let logOutError = $state(false);
	let logOutLoading = $state(false);

	async function signOut() {
		logOutLoading = true;
		logOutError = false;
		const res = await fetch('/api/auth/logout', { method: 'POST' });

		if (!res.ok) {
			logOutLoading = false;
			logOutError = true;
			return;
		}
		logOutLoading = false;
		goto('/login');
	}

	function closeSignOutModal() {
		openLogOutModal = false;
		logOutError = false;
		logOutLoading = false;
	}
</script>

<Root>
	<Header class="h-12 border-b">
		<Menu>
			<MenuItem class="flex items-center gap-2">
				<MenuButton>
					<LogoBrand
						width="16"
						height="16"
						textColor="hover:text-secondary-foreground dark:hover:text-secondary-foreground"
					/> Minventory
				</MenuButton>
			</MenuItem>
		</Menu>
	</Header>
	<Content>
		<Group>
			<Menu>
				<MenuItem>
					<MenuButton>Dashboard</MenuButton>
				</MenuItem>
				<MenuItem>
					<MenuButton>Products</MenuButton>
				</MenuItem>
			</Menu>
		</Group>
	</Content>
	<Footer>
		{@render footer()}
	</Footer>
</Root>

{#snippet footer()}
	<Group>
		<Menu>
			<MenuItem>
				<MenuButton onclick={() => (openLogOutModal = true)}>
					Logout
					<LogOut class="ml-auto" />
				</MenuButton>
			</MenuItem>
		</Menu>
	</Group>
{/snippet}

<Dialog bind:open={openLogOutModal}>
	<DialogContent onInteractOutside={(e) => e.preventDefault()} showCloseButton={false}>
		<h2 class="prose dark:prose-invert">Confirm sign out.</h2>
		{#if logOutError}
			<span class="text-destructive dark:text-destructive"
				>Something went wrong while logging out. Please try again.</span
			>
		{/if}
		<DialogFooter>
			<Button disabled={logOutLoading} variant="ghost" onclick={closeSignOutModal}>Cancel</Button>
			<Button disabled={logOutLoading} variant="destructive" onclick={signOut}>
				{#if logOutLoading}
					<Spinner />
					Signing out
				{:else}
					Sign out
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
