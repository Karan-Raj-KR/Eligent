interface FieldMap {
  [key: string]: string[];
}

const FIELD_SELECTORS: FieldMap = {
  email: ["input[type=email]", "input[name*=email]", "input[id*=email]"],
  firstName: ["input[name*=first]", "input[id*=first]", "input[name*=fname]"],
  lastName: ["input[name*=last]", "input[id*=last]", "input[name*=lname]"],
  gpa: ["input[name*=gpa]", "input[id*=gpa]"],
  sat: ["input[name*=sat]", "input[id*=sat]"],
  act: ["input[name*=act]", "input[id*=act]"],
  income: ["input[name*=income]", "input[id*=income]", "input[name*=earnings]"],
  major: ["input[name*=major]", "input[id*=major]", "select[name*=major]"],
  state: ["select[name*=state]", "input[name*=state]", "select[id*=state]"],
  phone: ["input[type=tel]", "input[name*=phone]", "input[id*=phone]"],
  address: ["input[name*=address]", "input[id*=address]", "textarea[name*=address]"],
  city: ["input[name*=city]", "input[id*=city]"],
  zip: ["input[name*=zip]", "input[id*=zip]", "input[name*=postal]"],
};

function findField(selectors: string[]): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) {
      return el;
    }
  }
  return null;
}

function fillField(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  if (!value) return;
  
  if (field instanceof HTMLSelectElement) {
    const option = Array.from(field.options).find(
      (opt) => opt.value.toLowerCase() === value.toLowerCase() || opt.text.toLowerCase().includes(value.toLowerCase())
    );
    if (option) {
      field.value = option.value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } else {
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

async function autofillForm() {
  return new Promise<void>((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_PROFILE" }, (response) => {
      const profile = response?.profile;
      if (!profile) {
        console.log("No profile found");
        resolve();
        return;
      }

      const mappings: Record<string, string> = {
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        gpa: profile.gpa?.toString(),
        sat: profile.sat?.toString(),
        act: profile.act?.toString(),
        income: profile.income?.toString(),
        major: profile.major,
        state: profile.state,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        zip: profile.zip,
      };

      Object.entries(mappings).forEach(([key, value]) => {
        if (!value) return;
        const field = findField(FIELD_SELECTORS[key] || []);
        if (field) fillField(field, value);
      });

      resolve();
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autofillForm);
} else {
  autofillForm();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "AUTOFILL_NOW") {
    autofillForm();
  }
});