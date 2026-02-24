"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { xOAuthApi } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      setStatus("error");
      setErrorMessage("Missing authorization parameters");
      return;
    }

    xOAuthApi
      .callback(state, code)
      .then((result) => {
        setStatus("success");
        setUsername(result.username);
        setTimeout(() => {
          router.push("/settings");
        }, 2000);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message || "Failed to complete authorization");
      });
  }, [searchParams, router]);

  return (
    <div className="container mx-auto max-w-md py-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">X Account Connection</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground">Connecting your X account...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-4xl">&#10003;</div>
              <p className="text-lg font-medium">
                @{username} と連携しました
              </p>
              <p className="text-sm text-muted-foreground">
                2秒後に設定ページへ移動します...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-4xl text-destructive">&#10005;</div>
              <p className="text-lg font-medium text-destructive">連携に失敗しました</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => router.push("/settings")} variant="outline">
                設定に戻る
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function XOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-md py-20">
          <Card>
            <CardContent className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
