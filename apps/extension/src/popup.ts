/// <reference lib="dom" />
/// <reference lib="webworker" />

interface Profile {
  email: string;
  firstName: string;
  lastName: string;
  gpa?: number;
  sat?: number;
  act?: number;
  income?: number;
  major?: string;
  state?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
}

document.getElementById("profileForm")?.addEventListener("submit", (e: Event) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const formData = new FormData(form);
  const profile: Profile = {} as Profile;
  
  formData.forEach((value: FormDataEntryValue, key: string) => {
    if (value) {
      if (["gpa", "sat", "act", "income"].includes(key)) {
        (profile as Record<string, number>)[key] = key === "gpa" ? parseFloat(value as string) : parseInt(value as string, 10);
      } else {
        (profile as Record<string, string>)[key] = value as string;
      }
    }
  });

  chrome.storage.sync.set({ profile }, () => {
    const status = document.getElementById("status") as HTMLElement | null;
    if (status) {
      status.textContent = "Profile saved! Autofill enabled.";
      status.className = "status success";
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "AUTOFILL_NOW" });
      }
    });
  });
});

chrome.storage.sync.get(["profile"], (result: { profile?: Profile }) => {
  if (result.profile) {
    const form = document.getElementById("profileForm") as HTMLFormElement;
    Object.entries(result.profile).forEach(([key, value]) => {
      const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement | HTMLSelectElement | null;
      if (input) input.value = String(value);
    });
  }
});