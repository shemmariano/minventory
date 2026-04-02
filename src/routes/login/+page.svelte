<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();

	let loading = $state<boolean>(false);
</script>

<div class="flex h-screen w-full flex-col items-center justify-center gap-8">
	<div class="prose dark:prose-invert">
		<h2>Login</h2>
	</div>

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
				<label for="username" class="pb-2"
					>Username <span class="text-destructive dark:text-destructive">*</span></label
				>
				<input id="username" type="text" name="username" placeholder="Enter username" required />
			</span>
			<span>
				<label for="password" class="pb-2"
					>Password <span class="text-destructive dark:text-destructive">*</span></label
				>
				<input
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
				<span class="text-destructive dark:text-destructive text-center">{form.message}</span>
			{/if}
			<button disabled={loading} type="submit">
				{#if loading}
					Logging in
				{:else}
					Login
				{/if}
			</button>
		</div>
	</form>
	<span class="prose dark:prose-invert"
		>No account yet? <a href="/register" class="text-accent-foreground dark:text-accent-foreground"
			>Register</a
		></span
	>
</div>
