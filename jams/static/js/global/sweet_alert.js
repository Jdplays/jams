export const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    iconColor: 'white',
    showConfirmButton: false,
    timer: 5000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
    customClass: {
      title: "m-0",
      popup: 'colored-toast',
    }
  });