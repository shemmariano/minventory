<script lang="ts">
	import { enhance } from '$app/forms';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import LogoBrand from '$lib/components/app/LogoBrand.svelte';
	let { form } = $props();

	let loading = $state<boolean>(false);
</script>

<div class="flex h-screen w-full flex-col items-center justify-center gap-8">
	<LogoBrand width="48" height="48" textColor="text-primary dark:text-primary" />
	<form
		method="POST"
		action=""
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
		class="flex h-fit w-80 flex-col gap-8 p-4 *:w-full"
	>
		<div class="flex flex-col gap-4">
			<span>
				<Label for="username" class="pb-2"
					>Username <span class="text-destructive dark:text-destructive">*</span></Label
				>
				<Input id="username" type="text" name="username" placeholder="Enter username" required />
			</span>
			<span>
				<Label for="password" class="pb-2"
					>Password <span class="text-destructive dark:text-destructive">*</span></Label
				>
				<Input
					id="password"
					type="password"
					name="password"
					placeholder="Enter password"
					required
				/>
			</span>
		</div>

		<div class="flex flex-col gap-3">
			{#if form?.message}
				<span class="text-center text-destructive dark:text-destructive">{form.message}</span>
			{/if}
			<Button disabled={loading} type="submit">
				{#if loading}
					<Spinner />
					Logging in
				{:else}
					Login
				{/if}
			</Button>
		</div>
	</form>
</div>
