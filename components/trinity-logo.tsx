import Image from "next/image";

export function TrinityLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return <Image className={`trinity-logo ${className}`} src="/images/trinity-logo.webp" alt="DJSCE Trinity" width={690} height={367} sizes="(max-width: 540px) 120px, 160px" priority={priority} />;
}
