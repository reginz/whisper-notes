"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export interface Yap {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useYaps() {
  const [yaps, setYaps] = useState<Yap[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchYaps = useCallback(async () => {
    const { data, error } = await supabase
      .from("yaps")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching yaps:", error.message || error);
    }

    setYaps(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchYaps();
  }, [fetchYaps]);

  const createYap = useCallback(async (): Promise<Yap | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("yaps")
      .insert({ user_id: user.id, content: "" })
      .select()
      .single();

    if (error) {
      console.error("Error creating yap:", error);
      return null;
    }

    setYaps((prev) => [data, ...prev]);
    return data;
  }, [supabase]);

  const updateYap = useCallback(
    async (id: string, content: string) => {
      const { error } = await supabase
        .from("yaps")
        .update({ content })
        .eq("id", id);

      if (error) {
        console.error("Error updating yap:", error);
        return;
      }

      setYaps((prev) =>
        prev.map((y) => (y.id === id ? { ...y, content } : y))
      );
    },
    [supabase]
  );

  const deleteYap = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("yaps").delete().eq("id", id);

      if (error) {
        console.error("Error deleting yap:", error);
        return;
      }

      setYaps((prev) => prev.filter((y) => y.id !== id));
    },
    [supabase]
  );

  const searchYaps = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        fetchYaps();
        return;
      }

      const { data, error } = await supabase
        .from("yaps")
        .select("*")
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error searching yaps:", error);
        return;
      }

      setYaps(data || []);
    },
    [supabase, fetchYaps]
  );

  return {
    yaps,
    loading,
    createYap,
    updateYap,
    deleteYap,
    searchYaps,
    refetch: fetchYaps,
  };
}

export function useYap(id: string) {
  const [yap, setYap] = useState<Yap | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchYap() {
      const { data, error } = await supabase
        .from("yaps")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching yap:", error);
      }

      setYap(data);
      setLoading(false);
    }

    fetchYap();
  }, [id, supabase]);

  const updateContent = useCallback(
    async (content: string) => {
      const { error } = await supabase
        .from("yaps")
        .update({ content })
        .eq("id", id);

      if (error) {
        console.error("Error updating yap:", error);
        return;
      }

      setYap((prev) => (prev ? { ...prev, content } : null));
    },
    [id, supabase]
  );

  return { yap, loading, setYap, updateContent };
}
