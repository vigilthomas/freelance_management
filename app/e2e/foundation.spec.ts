import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env.DEV_EMAIL ?? 'dev@forge.test';
const PASSWORD = process.env.DEV_PASSWORD ?? 'devpassword123';
const uid = () => Math.random().toString(36).slice(2, 7);

/** The visible sync pill (sidebar on desktop, top bar on mobile). */
const synced = (page: Page) => page.locator('button[aria-label="Sync status"]:visible', { hasText: 'Synced' });

async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(synced(page)).toBeVisible();
}

async function createClient(page: Page, name: string, rate = '1500') {
  await page.goto('/clients');
  await page.getByRole('button', { name: 'New client' }).click();
  const sheet = page.getByRole('dialog', { name: 'New client' });
  await sheet.getByLabel('Client / company name').fill(name);
  await sheet.getByLabel('Default hourly rate').fill(rate);
  await sheet.getByRole('button', { name: 'Add client' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
}

test('login → create client (INR) → create project for it → project shows ₹ currency', async ({ page }) => {
  const name = `E2E Client ${uid()}`;
  await login(page);
  await createClient(page, name);
  await page.getByRole('link', { name: new RegExp(name) }).click();
  await page.getByRole('button', { name: 'New project' }).click();
  const sheet = page.getByRole('dialog', { name: 'New project' });
  await expect(sheet.getByLabel('Client')).toHaveValue(/.+/);
  await sheet.getByLabel('Project name').fill('Website build');
  await sheet.getByLabel('Hourly rate').fill('1,000');
  await sheet.getByRole('button', { name: 'Create project' }).click();
  await expect(sheet).toBeHidden();
  await page.getByRole('link', { name: /Website build/ }).click();
  await expect(page.getByText('₹1,000.00/h')).toBeVisible();
  await expect(page.getByText('INR')).toBeVisible();
});

test('masters: deactivate "Lead" status → not offered in new project form; existing project still shows "Lead (inactive)"', async ({ page }) => {
  const name = `E2E Lead ${uid()}`;
  const setLeadActive = async (active: boolean) => {
    await page.goto('/masters/project_statuses');
    await page.getByRole('button', { name: /^Lead/ }).click();
    const edit = page.getByRole('dialog', { name: 'Edit project status' });
    const toggle = edit.getByRole('switch', { name: 'Active' });
    if ((await toggle.getAttribute('aria-checked')) !== String(active)) await toggle.click();
    await edit.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('[role=dialog]')).toHaveCount(0);
  };

  await login(page);
  await setLeadActive(true); // start from a known state even if an earlier run was interrupted
  await createClient(page, name);
  await page.getByRole('link', { name: new RegExp(name) }).click();
  await page.getByRole('button', { name: 'New project' }).click();
  let sheet = page.getByRole('dialog', { name: 'New project' });
  await sheet.getByLabel('Project name').fill('Lead project');
  await sheet.getByLabel('Status').selectOption({ label: 'Lead' });
  await sheet.getByRole('button', { name: 'Create project' }).click();
  await expect(sheet).toBeHidden();
  const projectUrl = await page.getByRole('link', { name: /Lead project/ }).getAttribute('href');

  await setLeadActive(false);
  try {
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New project' }).click();
    sheet = page.getByRole('dialog', { name: 'New project' });
    await expect(sheet.getByLabel('Status').locator('option', { hasText: 'Lead' })).toHaveCount(0);
    await sheet.getByRole('button', { name: 'Cancel' }).click();

    await page.goto(projectUrl!);
    const status = page.getByLabel('Status');
    await expect(status.locator('option:checked')).toHaveText('Lead (inactive)');
  } finally {
    await setLeadActive(true);
  }
});

test('offline: create client while offline → "1 pending" → back online → synced; reload → client still present', async ({ page, context }) => {
  const name = `E2E Offline ${uid()}`;
  await login(page);
  await page.goto('/clients');
  await expect(synced(page)).toBeVisible();

  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.getByRole('button', { name: 'New client' }).click();
  const sheet = page.getByRole('dialog', { name: 'New client' });
  await sheet.getByLabel('Client / company name').fill(name);
  await sheet.getByRole('button', { name: 'Add client' }).click();
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
  await expect(page.locator('button[aria-label="Sync status"]:visible', { hasText: '1 pending' })).toBeVisible();

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(synced(page)).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
});

test('mobile viewport 375px: bottom nav visible, no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page);
  for (const path of ['/', '/clients', '/projects', '/masters', '/settings']) {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.scrollingElement!.scrollWidth);
    expect(scrollWidth, `horizontal overflow on ${path}`).toBeLessThanOrEqual(375);
  }
});

test('sheets fully unmount after closing, so nothing invisible blocks the page', async ({ page }) => {
  await login(page);
  const open = async (path: string, opener: () => Promise<void>) => {
    await page.goto(path);
    await opener();
    await expect(page.getByRole('dialog')).toBeVisible();
  };
  // A moved shared-layout pill (billing switch) and an edit sheet with a non-first colour used to keep the overlay mounted.
  await open('/projects', async () => {
    await page.getByRole('button', { name: 'New project' }).first().click();
    await page.getByRole('tab', { name: 'Fixed price' }).click();
  });
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('[role=dialog]')).toHaveCount(0);

  await open('/masters/units', () => page.getByRole('button', { name: /^Hour/ }).click());
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('[role=dialog]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Clients' }).first().click();
  await expect(page).toHaveURL(/\/clients$/);
});
