<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
</script>

<div class="flex h-screen w-full flex-col items-center justify-center gap-8">
	<div class="prose dark:prose-invert">
		<h2>Minventory</h2>
	</div>
	<form action="" class="flex h-fit w-80 flex-col gap-8 p-4 *:w-full">
		<div class="flex flex-col gap-4">
			<span>
				<Label class="pb-2"
					>Username <span class="text-destructive dark:text-destructive">*</span></Label
				>
				<Input id="uname" type="text" name="username" placeholder="Enter username" required />
			</span>
			<span>
				<Label class="pb-2"
					>Password <span class="text-destructive dark:text-destructive">*</span></Label
				>
				<Input id="pass" type="password" name="password" placeholder="Enter password" required />
			</span>
		</div>
		<Button>Login</Button>
	</form>
</div>
