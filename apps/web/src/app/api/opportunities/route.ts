import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { supabase, user } = await getSessionUser();
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category");
  const locationType = searchParams.get("location_type");
  const search = searchParams.get("search");
  const creatorOnly = searchParams.get("my") === "true";

  if (!supabase) {
    return NextResponse.json({ opportunities: [] });
  }

  let query = supabase.from("opportunity").select("*").order("created_at", { ascending: false });

  if (creatorOnly) {
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    query = query.eq("creator_user_id", user.id);
  } else {
    // Public discover view: only published, or user's own items
    if (user) {
      query = query.or(`status.eq.published,creator_user_id.eq.${user.id}`);
    } else {
      query = query.eq("status", "published");
    }
  }

  if (category && category !== "all" && category !== "ALL") {
    query = query.eq("category", category.toLowerCase());
  }
  if (locationType && locationType !== "all" && locationType !== "ALL") {
    query = query.eq("location_type", locationType.toLowerCase());
  }
  if (search && search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ opportunities: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await getSessionUser();
  if (!supabase || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  const {
    name,
    organization,
    provider,
    category,
    location_type,
    deadline,
    amount,
    url,
    description,
    tags,
    skills,
  } = body as Record<string, unknown>;

  // Validation
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const orgName = (typeof organization === "string" && organization.trim()) || (typeof provider === "string" && provider.trim()) || "Community Organization";

  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "Application URL is required" }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Please enter a valid URL (including http:// or https://)" }, { status: 400 });
  }

  if (typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const validCategories = [
    "scholarship", "fellowship", "grant", "hackathon",
    "internship", "job", "programme", "event", "competition", "workshop"
  ];
  const cat = typeof category === "string" && validCategories.includes(category.toLowerCase())
    ? category.toLowerCase()
    : "event";

  const loc = typeof location_type === "string" && ["india", "abroad", "online"].includes(location_type.toLowerCase())
    ? location_type.toLowerCase()
    : "india";

  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  if (isDemo || !supabase) {
    const createdItem = {
      id: `opp-demo-${Date.now()}`,
      creator_user_id: user?.id ?? "demo-user-id",
      name: name.trim(),
      provider: orgName,
      organization: orgName,
      url: url.trim(),
      deadline: typeof deadline === "string" && deadline ? deadline : null,
      amount: typeof amount === "string" ? amount.trim() : null,
      category: cat,
      location_type: loc,
      description: description.trim(),
      tags: Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [],
      skills: Array.isArray(skills) ? skills.filter((s) => typeof s === "string") : [],
      status: "pending_review",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json(createdItem);
  }

  const newOpp = {
    creator_user_id: user.id,
    name: name.trim(),
    provider: orgName,
    organization: orgName,
    url: url.trim(),
    deadline: typeof deadline === "string" && deadline ? deadline : null,
    amount: typeof amount === "string" ? amount.trim() : null,
    category: cat,
    location_type: loc,
    description: description.trim(),
    tags: Array.isArray(tags) ? tags.filter((t) => typeof t === "string") : [],
    skills: Array.isArray(skills) ? skills.filter((s) => typeof s === "string") : [],
    status: "pending_review",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("opportunity").insert(newOpp).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Create status notification for creator
  await supabase.from("notification").insert({
    user_id: user.id,
    type: "status_changed",
    title: "Opportunity Submitted for Review",
    message: `"${data.name}" has been submitted and is currently pending review.`,
    link: "/opportunities/my",
    opportunity_id: data.id,
  });

  return NextResponse.json(data);
}
