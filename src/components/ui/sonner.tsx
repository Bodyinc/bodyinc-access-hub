import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      theme="light"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border group-[.toaster]:shadow-lg group-[.toaster]:bg-white group-[.toaster]:text-[#3B4759] group-[.toaster]:border-[#D5DEDD]",
          description: "group-[.toast]:text-[#3B4759]/70",
          error:
            "group-[.toaster]:bg-[#FBF1EC] group-[.toaster]:text-[#8F4A33] group-[.toaster]:border-[#B8684B]/40",
          success:
            "group-[.toaster]:bg-[#F2F7F6] group-[.toaster]:text-[#3B4759] group-[.toaster]:border-[#6A9B9C]/40",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
