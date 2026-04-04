<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Drawer, DrawerClose, DrawerContent, DrawerFooter } from '$lib/components/ui/drawer';
	import {
		Field,
		FieldSet,
		FieldLegend,
		FieldGroup,
		FieldLabel,
		FieldDescription,
		FieldSeparator
	} from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import {
		InputGroup,
		InputGroupAddon,
		InputGroupInput,
		InputGroupText
	} from '$lib/components/ui/input-group';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { Textarea } from '$lib/components/ui/textarea';
	import { X } from '@lucide/svelte';
	import type { FormBody } from './columns';

	interface Props {
		open: boolean;
		body: FormBody;
		mode: 'add' | 'update';
		onsave: (body: FormBody) => void;
	}

	let { open = $bindable(), body, mode = 'add', onsave }: Props = $props();

	// svelte-ignore state_referenced_locally
	let formBody = $state<FormBody>({ ...body });

	function saveForm() {
		onsave(formBody);
	}

	$effect(() => {
		if (!open) {
			formBody = { ...body };
		}
	});
</script>

<Drawer direction="right" bind:open>
	<DrawerContent>
		<DrawerClose class="absolute top-4 right-4">
			{#snippet child({ props })}
				<Button {...props} variant="secondary"><X /></Button>
			{/snippet}
		</DrawerClose>

		<form class="p-6">
			<FieldSet>
				<FieldLegend>Add New Product</FieldLegend>
				<FieldDescription>Fill out all required fields before saving.</FieldDescription>
				<FieldGroup>
					<Field>
						<FieldLabel>Product Name</FieldLabel>
						<Input placeholder="Enter name" bind:value={formBody.name} />
					</Field>
					<Field>
						<FieldLabel>Brand</FieldLabel>
						<Input placeholder="Enter brand" bind:value={formBody.brand} />
						<FieldDescription>Example: Nike, Adidas, Uniqlo, etc.</FieldDescription>
					</Field>
					<Field>
						<FieldLabel>Price</FieldLabel>
						<InputGroup>
							<InputGroupAddon>
								<InputGroupText>₱</InputGroupText>
							</InputGroupAddon>
							<InputGroupInput placeholder="0.00" bind:value={formBody.price} />
							<InputGroupAddon align="inline-end">
								<InputGroupText>PHP</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
					</Field>
					{#if mode === 'update'}
						<FieldSeparator />
						<FieldGroup>
							<FieldLabel>Status</FieldLabel>
							<RadioGroup bind:value={formBody.status}>
								<Field orientation="horizontal">
									<RadioGroupItem value="available" id="available" />
									<FieldLabel for="available">Available</FieldLabel>
								</Field>
								<Field orientation="horizontal">
									<RadioGroupItem value="reserved" id="reserved" />
									<FieldLabel for="reserved">Reserved</FieldLabel>
								</Field>
								<Field orientation="horizontal">
									<RadioGroupItem value="sold" id="sold" />
									<FieldLabel for="sold">Sold</FieldLabel>
								</Field>
							</RadioGroup>
						</FieldGroup>
					{/if}
					<FieldSeparator />
					<Field>
						<FieldLabel>Notes</FieldLabel>
						<Textarea rows={4} bind:value={formBody.notes} />
					</Field>
				</FieldGroup>
			</FieldSet>
		</form>
		<DrawerFooter class="ms-auto flex-row gap-2 p-6">
			<DrawerClose>
				{#snippet child({ props })}
					<Button {...props} variant="secondary">Close</Button>
				{/snippet}
			</DrawerClose>
			<Button onclick={saveForm}>Save</Button>
		</DrawerFooter>
	</DrawerContent>
</Drawer>
