"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { useYaps } from "@/hooks/use-yaps";
import { SearchBar } from "@/components/search-bar";
import { YapList } from "@/components/yap-list";
import { RecordFAB } from "@/components/record-fab";

export default function YapsListPage() {
  const router = useRouter();
  const { yaps, loading, createYap, deleteYap, searchYaps } = useYaps();
  const isCreatingRef = useRef(false);

  const handleRecord = useCallback(async () => {
    if (isCreatingRef.current) return;
    isCreatingRef.current = true;

    try {
      const yap = await createYap();
      if (yap) {
        router.push(`/yaps/${yap.id}?record=true`);
      }
    } finally {
      isCreatingRef.current = false;
    }
  }, [createYap, router]);

  const handleTapYap = useCallback(
    (id: string) => {
      router.push(`/yaps/${id}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteYap(id);
    },
    [deleteYap]
  );

  const handleSearch = useCallback(
    (query: string) => {
      searchYaps(query);
    },
    [searchYaps]
  );

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="px-4 pb-1 pt-6">
        <h1 className="text-3xl font-bold text-foreground">Yaps</h1>
      </div>

      {/* Search */}
      <SearchBar onSearch={handleSearch} />

      {/* Yap list */}
      <YapList yaps={yaps} onTapYap={handleTapYap} onDeleteYap={handleDelete} />

      {/* Record button */}
      <RecordFAB onClick={handleRecord} />
    </div>
  );
}
